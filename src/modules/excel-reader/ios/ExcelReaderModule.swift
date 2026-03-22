import ExpoModulesCore
import Foundation
import ZIPFoundation

private let importedExcelImagesDirectoryName = "imported_excel_images"

public class ExcelReaderModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ExcelReaderModule")

    AsyncFunction("extractImages") { (filePath: String, sheetName: String?) -> [String: Any] in
      let xlsxService = XlsxArchiveService()
      return try xlsxService.performExtraction(filePath: filePath, sheetName: sheetName)
    }

    AsyncFunction("readSheetRowsChunk") {
      (filePath: String, sheetName: String, startRow: Int, limit: Int) -> [String: Any] in
      let xlsxService = XlsxArchiveService()
      return try xlsxService.performReadSheetRowsChunk(
        filePath: filePath,
        sheetName: sheetName,
        startRow: startRow,
        limit: limit
      )
    }

    AsyncFunction("listSheetNames") { (filePath: String) -> [String] in
      let xlsxService = XlsxArchiveService()
      return try xlsxService.performListSheetNames(filePath: filePath)
    }
  }
}

private struct ParsedRelationship {
  let id: String
  let type: String?
  let target: String
}

private final class RelationshipsParser: NSObject, XMLParserDelegate {
  private(set) var relationships: [ParsedRelationship] = []

  func parser(
    _ parser: XMLParser,
    didStartElement elementName: String,
    namespaceURI: String?,
    qualifiedName qName: String?,
    attributes attributeDict: [String: String] = [:]
  ) {
    guard elementName.hasSuffix("Relationship") else { return }

    let id = attributeDict["Id"] ?? ""
    let target = attributeDict["Target"] ?? ""
    let type = attributeDict["Type"]

    if !id.isEmpty, !target.isEmpty {
      relationships.append(ParsedRelationship(id: id, type: type, target: target))
    }
  }
}

private struct WorkbookSheetRef {
  let name: String
  let relationshipId: String
}

private final class WorkbookSheetsParser: NSObject, XMLParserDelegate {
  private(set) var sheets: [WorkbookSheetRef] = []

  func parser(
    _ parser: XMLParser,
    didStartElement elementName: String,
    namespaceURI: String?,
    qualifiedName qName: String?,
    attributes attributeDict: [String: String] = [:]
  ) {
    guard elementName.hasSuffix("sheet") else { return }
    guard let name = attributeDict["name"], !name.isEmpty else { return }
    guard let rid = attributeDict["r:id"] ?? attributeDict["id"], !rid.isEmpty else { return }

    sheets.append(WorkbookSheetRef(name: name, relationshipId: rid))
  }
}

private struct DrawingAnchor {
  let row: Int
  let relationshipId: String
}

private final class DrawingAnchorsParser: NSObject, XMLParserDelegate {
  private(set) var anchors: [DrawingAnchor] = []

  private var inAnchorContainer = false
  private var inFrom = false
  private var readingRowText = false
  private var currentRowText = ""
  private var currentRow: Int?
  private var currentRelationshipId: String?

  func parser(
    _ parser: XMLParser,
    didStartElement elementName: String,
    namespaceURI: String?,
    qualifiedName qName: String?,
    attributes attributeDict: [String: String] = [:]
  ) {
    if elementName.hasSuffix("twoCellAnchor") || elementName.hasSuffix("oneCellAnchor") {
      inAnchorContainer = true
      inFrom = false
      readingRowText = false
      currentRowText = ""
      currentRow = nil
      currentRelationshipId = nil
      return
    }

    guard inAnchorContainer else { return }

    if elementName.hasSuffix("from") {
      inFrom = true
      return
    }

    if inFrom && elementName.hasSuffix("row") {
      readingRowText = true
      currentRowText = ""
      return
    }

    if elementName.hasSuffix("blip") {
      let embedId = attributeDict["r:embed"] ?? attributeDict["embed"]
      if let embedId, !embedId.isEmpty {
        currentRelationshipId = embedId
      }
    }
  }

  func parser(_ parser: XMLParser, foundCharacters string: String) {
    guard readingRowText else { return }
    currentRowText += string
  }

  func parser(
    _ parser: XMLParser,
    didEndElement elementName: String,
    namespaceURI: String?,
    qualifiedName qName: String?
  ) {
    if readingRowText && elementName.hasSuffix("row") {
      readingRowText = false
      let trimmed = currentRowText.trimmingCharacters(in: .whitespacesAndNewlines)
      currentRow = Int(trimmed)
      return
    }

    if elementName.hasSuffix("from") {
      inFrom = false
      return
    }

    if elementName.hasSuffix("twoCellAnchor") || elementName.hasSuffix("oneCellAnchor") {
      if let row = currentRow, let relationshipId = currentRelationshipId {
        anchors.append(DrawingAnchor(row: row, relationshipId: relationshipId))
      }

      inAnchorContainer = false
      inFrom = false
      readingRowText = false
      currentRowText = ""
      currentRow = nil
      currentRelationshipId = nil
    }
  }
}

private final class SharedStringsParser: NSObject, XMLParserDelegate {
  private(set) var strings: [String] = []

  private var inStringItem = false
  private var readingText = false
  private var currentText = ""

  func parser(
    _ parser: XMLParser,
    didStartElement elementName: String,
    namespaceURI: String?,
    qualifiedName qName: String?,
    attributes attributeDict: [String: String] = [:]
  ) {
    if elementName.hasSuffix("si") {
      inStringItem = true
      currentText = ""
      return
    }

    if inStringItem && elementName.hasSuffix("t") {
      readingText = true
    }
  }

  func parser(_ parser: XMLParser, foundCharacters string: String) {
    guard readingText else { return }
    currentText += string
  }

  func parser(
    _ parser: XMLParser,
    didEndElement elementName: String,
    namespaceURI: String?,
    qualifiedName qName: String?
  ) {
    if elementName.hasSuffix("t") {
      readingText = false
      return
    }

    if elementName.hasSuffix("si") {
      strings.append(currentText)
      inStringItem = false
      readingText = false
      currentText = ""
    }
  }
}

private final class WorksheetRowsParser: NSObject, XMLParserDelegate {
  private let sharedStrings: [String]
  private let startRow: Int
  private let endRow: Int

  private(set) var rows: [[String: Any]] = []
  private(set) var nextStartRow: Int
  private(set) var done = false
  private(set) var didAbortEarly = false

  private var inRow = false
  private var inCell = false
  private var readingValue = false

  private var currentRowNumber: Int?
  private var lastSeenRowNumber = 0
  private var currentCellType: String?
  private var currentCellColumnIndex: Int?
  private var currentCellText = ""
  private var currentRowValues: [Int: Any] = [:]
  private var maxColumnIndexInCurrentRow = -1

  init(sharedStrings: [String], startRow: Int, limit: Int) {
    self.sharedStrings = sharedStrings
    self.startRow = max(1, startRow)
    let boundedLimit = max(1, limit)
    self.endRow = max(1, startRow) + boundedLimit - 1
    self.nextStartRow = max(1, startRow)
    super.init()
  }

  func parser(
    _ parser: XMLParser,
    didStartElement elementName: String,
    namespaceURI: String?,
    qualifiedName qName: String?,
    attributes attributeDict: [String: String] = [:]
  ) {
    if elementName.hasSuffix("row") {
      let explicitRow = Int(attributeDict["r"] ?? "")
      let rowNumber = explicitRow ?? (lastSeenRowNumber + 1)
      lastSeenRowNumber = rowNumber

      if rowNumber > endRow {
        nextStartRow = rowNumber
        done = false
        didAbortEarly = true
        parser.abortParsing()
        return
      }

      inRow = true
      currentRowNumber = rowNumber
      currentRowValues = [:]
      maxColumnIndexInCurrentRow = -1
      return
    }

    guard inRow else { return }

    if elementName.hasSuffix("c") {
      inCell = true
      currentCellType = attributeDict["t"]
      currentCellColumnIndex = columnIndex(fromCellReference: attributeDict["r"])
      if currentCellColumnIndex == nil {
        currentCellColumnIndex = maxColumnIndexInCurrentRow + 1
      }
      currentCellText = ""
      return
    }

    guard inCell else { return }

    if elementName.hasSuffix("v") || (currentCellType == "inlineStr" && elementName.hasSuffix("t")) {
      readingValue = true
      currentCellText = ""
    }
  }

  func parser(_ parser: XMLParser, foundCharacters string: String) {
    guard readingValue else { return }
    currentCellText += string
  }

  func parser(
    _ parser: XMLParser,
    didEndElement elementName: String,
    namespaceURI: String?,
    qualifiedName qName: String?
  ) {
    if readingValue && (elementName.hasSuffix("v") || elementName.hasSuffix("t")) {
      readingValue = false
      return
    }

    if elementName.hasSuffix("c") {
      if let rowNumber = currentRowNumber,
         rowNumber >= startRow,
         rowNumber <= endRow,
         let columnIndex = currentCellColumnIndex {
        let parsedValue = parseCellValue(raw: currentCellText, type: currentCellType)
        if let parsedValue {
          currentRowValues[columnIndex] = parsedValue
          if columnIndex > maxColumnIndexInCurrentRow {
            maxColumnIndexInCurrentRow = columnIndex
          }
        }
      }

      inCell = false
      currentCellType = nil
      currentCellColumnIndex = nil
      currentCellText = ""
      return
    }

    if elementName.hasSuffix("row") {
      defer {
        inRow = false
        inCell = false
        readingValue = false
        currentRowNumber = nil
        currentRowValues = [:]
        maxColumnIndexInCurrentRow = -1
      }

      guard let rowNumber = currentRowNumber else { return }
      guard rowNumber >= startRow, rowNumber <= endRow else { return }

      if currentRowValues.isEmpty, rowNumber != 1 {
        return
      }

      let rowValues = denseRowValues(cells: currentRowValues, maxColumnIndex: maxColumnIndexInCurrentRow)
      rows.append([
        "excelRow": rowNumber,
        "values": rowValues,
      ])

      nextStartRow = rowNumber + 1
    }
  }

  func parserDidEndDocument(_ parser: XMLParser) {
    done = true
    if rows.isEmpty {
      nextStartRow = startRow
    }
  }

  private func denseRowValues(cells: [Int: Any], maxColumnIndex: Int) -> [Any] {
    guard maxColumnIndex >= 0 else { return [] }

    var values: [Any] = Array(repeating: NSNull(), count: maxColumnIndex + 1)
    for (columnIndex, value) in cells {
      guard columnIndex >= 0, columnIndex < values.count else { continue }
      values[columnIndex] = value
    }

    return values
  }

  private func columnIndex(fromCellReference reference: String?) -> Int? {
    guard let reference, !reference.isEmpty else { return nil }

    let letters = reference.prefix { $0.isLetter }
    guard !letters.isEmpty else { return nil }

    var index = 0
    for scalar in letters.uppercased().unicodeScalars {
      let value = Int(scalar.value) - 64
      guard value >= 1 && value <= 26 else { return nil }
      index = index * 26 + value
    }

    return index - 1
  }

  private func parseCellValue(raw: String, type: String?) -> Any? {
    let text = raw.trimmingCharacters(in: .whitespacesAndNewlines)
    if text.isEmpty {
      return nil
    }

    switch type {
    case "s":
      if let sharedIndex = Int(text), sharedIndex >= 0, sharedIndex < sharedStrings.count {
        return sharedStrings[sharedIndex]
      }
      return text
    case "b":
      return text == "1"
    case "str", "inlineStr":
      return text
    default:
      if let intValue = Int(text) {
        return intValue
      }
      if let doubleValue = Double(text) {
        return doubleValue
      }
      return text
    }
  }
}

private final class XlsxArchiveService {
  func performExtraction(filePath: String, sheetName: String?) throws -> [String: Any] {
    let fm = FileManager.default
    let sourcePath = normalizedLocalPath(filePath)
    guard fm.fileExists(atPath: sourcePath) else {
      throw NSError(domain: "XlsxImageExtractor", code: 1, userInfo: [
        NSLocalizedDescriptionKey: "XLSX file not found at path: \(sourcePath)",
      ])
    }

    guard sourcePath.lowercased().hasSuffix(".xlsx") else {
      throw NSError(domain: "XlsxImageExtractor", code: 2, userInfo: [
        NSLocalizedDescriptionKey: "Only .xlsx files are supported",
      ])
    }

    let caches = try fm.url(
      for: .cachesDirectory,
      in: .userDomainMask,
      appropriateFor: nil,
      create: true
    )

    let documents = try fm.url(
      for: .documentDirectory,
      in: .userDomainMask,
      appropriateFor: nil,
      create: true
    )

    let workRoot = caches
      .appendingPathComponent("xlsx_image_imports", isDirectory: true)
      .appendingPathComponent(UUID().uuidString, isDirectory: true)
    let unzipDir = workRoot.appendingPathComponent("unzipped", isDirectory: true)
    let outputDir = documents
      .appendingPathComponent(importedExcelImagesDirectoryName, isDirectory: true)
      .appendingPathComponent(UUID().uuidString, isDirectory: true)

    if fm.fileExists(atPath: workRoot.path) {
      try? fm.removeItem(at: workRoot)
    }

    defer {
      if fm.fileExists(atPath: workRoot.path) {
        try? fm.removeItem(at: workRoot)
      }
    }

    try fm.createDirectory(at: unzipDir, withIntermediateDirectories: true)
    try fm.createDirectory(at: outputDir, withIntermediateDirectories: true)

    let sourceURL = URL(fileURLWithPath: sourcePath)
    try fm.unzipItem(at: sourceURL, to: unzipDir)

    let drawingFiles = try resolveDrawingFiles(
      unzipDir: unzipDir,
      sheetName: sheetName,
      fileManager: fm
    )

    print("[ExcelReader][extractImages] start", [
      "sheetName": sheetName ?? "<all>",
      "drawingFiles": String(drawingFiles.count),
    ])

    var allowedMediaFileNames: Set<String>? = nil
    if let sheetName, !sheetName.isEmpty {
      var referencedBySheet = Set<String>()

      for drawingFile in drawingFiles {
        let relsFile = drawingFile
          .deletingLastPathComponent()
          .appendingPathComponent("_rels", isDirectory: true)
          .appendingPathComponent("\(drawingFile.lastPathComponent).rels")

        let relationships = try parseRelationships(from: relsFile)
        for relationship in relationships {
          let fileName = (relationship.target as NSString).lastPathComponent
          if !fileName.isEmpty {
            referencedBySheet.insert(fileName)
          }
        }
      }

      allowedMediaFileNames = referencedBySheet

      print("[ExcelReader][extractImages] referenced media", [
        "sheetName": sheetName,
        "count": String(referencedBySheet.count),
      ])
    }

    let mediaDir = unzipDir.appendingPathComponent("xl/media", isDirectory: true)
    var copiedMediaByFileName: [String: String] = [:]
    var copiedMediaPaths: [String] = []

    if fm.fileExists(atPath: mediaDir.path) {
      let mediaFiles = try fm.contentsOfDirectory(
        at: mediaDir,
        includingPropertiesForKeys: nil,
        options: [.skipsHiddenFiles]
      )

      print("[ExcelReader][extractImages] media pool", [
        "sheetName": sheetName ?? "<all>",
        "totalInArchive": String(mediaFiles.count),
      ])

      for mediaFile in mediaFiles {
        let fileName = mediaFile.lastPathComponent
        if let allowedMediaFileNames, !allowedMediaFileNames.contains(fileName) {
          continue
        }

        let destination = outputDir.appendingPathComponent(fileName)

        if fm.fileExists(atPath: destination.path) {
          try fm.removeItem(at: destination)
        }

        try fm.copyItem(at: mediaFile, to: destination)
        copiedMediaByFileName[fileName] = destination.path
        copiedMediaPaths.append(destination.path)
      }
    }

    print("[ExcelReader][extractImages] copied media", [
      "sheetName": sheetName ?? "<all>",
      "count": String(copiedMediaPaths.count),
    ])

    var anchored: [String: String] = [:]
    var usedAnchoredPaths = Set<String>()

    for drawingFile in drawingFiles {
      let anchors = try parseDrawingAnchors(from: drawingFile)
      let relsFile = drawingFile
        .deletingLastPathComponent()
        .appendingPathComponent("_rels", isDirectory: true)
        .appendingPathComponent("\(drawingFile.lastPathComponent).rels")

      let relationships = try parseRelationships(from: relsFile)
      var ridToTargetFileName: [String: String] = [:]
      for relationship in relationships {
        let fileName = (relationship.target as NSString).lastPathComponent
        ridToTargetFileName[relationship.id] = fileName
      }

      for anchor in anchors {
        guard let targetFileName = ridToTargetFileName[anchor.relationshipId] else { continue }
        guard let localPath = copiedMediaByFileName[targetFileName] else { continue }

        let excelRow = String(anchor.row + 1)
        if anchored[excelRow] == nil {
          anchored[excelRow] = localPath
          usedAnchoredPaths.insert(localPath)
        }
      }
    }

    let unanchored = copiedMediaPaths
      .filter { !usedAnchoredPaths.contains($0) }
      .sorted()

    print("[ExcelReader][extractImages] result", [
      "sheetName": sheetName ?? "<all>",
      "anchored": String(anchored.count),
      "unanchored": String(unanchored.count),
    ])

    return [
      "anchored": anchored,
      "unanchored": unanchored,
    ]
  }

  func performReadSheetRowsChunk(
    filePath: String,
    sheetName: String,
    startRow: Int,
    limit: Int
  ) throws -> [String: Any] {
    let fm = FileManager.default
    let sourcePath = normalizedLocalPath(filePath)

    guard fm.fileExists(atPath: sourcePath) else {
      throw NSError(domain: "XlsxImageExtractor", code: 10, userInfo: [
        NSLocalizedDescriptionKey: "XLSX file not found at path: \(sourcePath)",
      ])
    }

    guard sourcePath.lowercased().hasSuffix(".xlsx") else {
      throw NSError(domain: "XlsxImageExtractor", code: 11, userInfo: [
        NSLocalizedDescriptionKey: "Only .xlsx files are supported",
      ])
    }

    let sourceURL = URL(fileURLWithPath: sourcePath)
    let worksheetPath = try resolveWorksheetPathInArchive(
      xlsxURL: sourceURL,
      sheetName: sheetName
    )

    guard let worksheetData = try readZipEntryData(xlsxURL: sourceURL, entryPath: worksheetPath) else {
      throw NSError(domain: "XlsxImageExtractor", code: 12, userInfo: [
        NSLocalizedDescriptionKey: "Worksheet XML not found: \(worksheetPath)",
      ])
    }

    let sharedStrings = try loadSharedStrings(xlsxURL: sourceURL)
    let parserDelegate = WorksheetRowsParser(
      sharedStrings: sharedStrings,
      startRow: max(1, startRow),
      limit: max(1, limit)
    )

    let parser = XMLParser(data: worksheetData)
    parser.delegate = parserDelegate
    parser.shouldProcessNamespaces = false
    parser.shouldReportNamespacePrefixes = false
    parser.shouldResolveExternalEntities = false

    let parsed = parser.parse()
    if !parsed, !parserDelegate.didAbortEarly {
      throw parser.parserError ?? NSError(
        domain: "XlsxImageExtractor",
        code: 13,
        userInfo: [NSLocalizedDescriptionKey: "Failed to parse worksheet: \(worksheetPath)"]
      )
    }

    return [
      "rows": parserDelegate.rows,
      "nextStartRow": parserDelegate.nextStartRow,
      "done": parserDelegate.done,
    ]
  }

  func performListSheetNames(filePath: String) throws -> [String] {
    let sourcePath = normalizedLocalPath(filePath)
    let sourceURL = URL(fileURLWithPath: sourcePath)

    guard let workbookData = try readZipEntryData(xlsxURL: sourceURL, entryPath: "xl/workbook.xml") else {
      throw NSError(domain: "XlsxImageExtractor", code: 22, userInfo: [
        NSLocalizedDescriptionKey: "Missing xl/workbook.xml",
      ])
    }

    let sheets = try parseWorkbookSheets(from: workbookData, context: "xl/workbook.xml")
    return sheets.map { $0.name }
  }

  private func resolveDrawingFiles(
    unzipDir: URL,
    sheetName: String?,
    fileManager: FileManager
  ) throws -> [URL] {
    let drawingsDir = unzipDir.appendingPathComponent("xl/drawings", isDirectory: true)
    guard fileManager.fileExists(atPath: drawingsDir.path) else {
      return []
    }

    if sheetName == nil || sheetName?.isEmpty == true {
      return try allDrawingXmlFiles(in: drawingsDir, fileManager: fileManager)
    }

    let workbookFile = unzipDir.appendingPathComponent("xl/workbook.xml")
    let workbookRelsFile = unzipDir.appendingPathComponent("xl/_rels/workbook.xml.rels")

    let workbookSheets = try parseWorkbookSheets(from: workbookFile)
    let workbookRels = try parseRelationships(from: workbookRelsFile)

    guard let sheetRef = workbookSheets.first(where: { $0.name == sheetName }) else {
      return []
    }

    guard let worksheetTarget = workbookRels.first(where: { $0.id == sheetRef.relationshipId })?.target else {
      return []
    }

    let worksheetXml = resolveRelativePath(base: "xl/workbook.xml", target: worksheetTarget)
    let worksheetRelsPath = worksheetRelationshipsPath(forWorksheetPath: worksheetXml)
    let worksheetRelsFile = unzipDir.appendingPathComponent(worksheetRelsPath)

    if !fileManager.fileExists(atPath: worksheetRelsFile.path) {
      return []
    }

    let worksheetRels = try parseRelationships(from: worksheetRelsFile)
    let drawingRels = worksheetRels.filter { relationship in
      relationship.type?.contains("/drawing") == true
    }

    var drawingFiles: [URL] = []
    for drawingRel in drawingRels {
      let drawingPath = resolveRelativePath(base: worksheetXml, target: drawingRel.target)
      let drawingFile = unzipDir.appendingPathComponent(drawingPath)
      if fileManager.fileExists(atPath: drawingFile.path) {
        drawingFiles.append(drawingFile)
      }
    }

    return drawingFiles
  }

  private func allDrawingXmlFiles(in drawingsDir: URL, fileManager: FileManager) throws -> [URL] {
    try fileManager
      .contentsOfDirectory(at: drawingsDir, includingPropertiesForKeys: nil, options: [.skipsHiddenFiles])
      .filter { $0.pathExtension.lowercased() == "xml" }
      .filter { !$0.lastPathComponent.contains(".rels") }
      .sorted { $0.lastPathComponent < $1.lastPathComponent }
  }

  private func readZipEntryData(xlsxURL: URL, entryPath: String) throws -> Data? {
    guard let archive = Archive(url: xlsxURL, accessMode: .read) else {
      throw NSError(domain: "XlsxImageExtractor", code: 14, userInfo: [
        NSLocalizedDescriptionKey: "Unable to open XLSX archive",
      ])
    }

    guard let entry = archive[entryPath] else {
      return nil
    }

    var data = Data()
    _ = try archive.extract(entry) { chunk in
      data.append(chunk)
    }

    return data
  }

  private func parseRelationships(from data: Data, context: String) throws -> [ParsedRelationship] {
    let parser = XMLParser(data: data)
    let delegate = RelationshipsParser()
    parser.delegate = delegate
    parser.shouldProcessNamespaces = false
    parser.shouldReportNamespacePrefixes = false
    parser.shouldResolveExternalEntities = false

    guard parser.parse() else {
      throw parser.parserError ?? NSError(
        domain: "XlsxImageExtractor",
        code: 15,
        userInfo: [NSLocalizedDescriptionKey: "Failed to parse relationships: \(context)"]
      )
    }

    return delegate.relationships
  }

  private func parseWorkbookSheets(from data: Data, context: String) throws -> [WorkbookSheetRef] {
    let parser = XMLParser(data: data)
    let delegate = WorkbookSheetsParser()
    parser.delegate = delegate
    parser.shouldProcessNamespaces = false
    parser.shouldReportNamespacePrefixes = false
    parser.shouldResolveExternalEntities = false

    guard parser.parse() else {
      throw parser.parserError ?? NSError(
        domain: "XlsxImageExtractor",
        code: 16,
        userInfo: [NSLocalizedDescriptionKey: "Failed to parse workbook sheets: \(context)"]
      )
    }

    return delegate.sheets
  }

  private func loadSharedStrings(xlsxURL: URL) throws -> [String] {
    guard let sharedStringsData = try readZipEntryData(xlsxURL: xlsxURL, entryPath: "xl/sharedStrings.xml") else {
      return []
    }

    let parser = XMLParser(data: sharedStringsData)
    let delegate = SharedStringsParser()
    parser.delegate = delegate
    parser.shouldProcessNamespaces = false
    parser.shouldReportNamespacePrefixes = false
    parser.shouldResolveExternalEntities = false

    guard parser.parse() else {
      throw parser.parserError ?? NSError(
        domain: "XlsxImageExtractor",
        code: 17,
        userInfo: [NSLocalizedDescriptionKey: "Failed to parse shared strings"]
      )
    }

    return delegate.strings
  }

  private func resolveWorksheetPathInArchive(xlsxURL: URL, sheetName: String) throws -> String {
    guard let workbookData = try readZipEntryData(xlsxURL: xlsxURL, entryPath: "xl/workbook.xml") else {
      throw NSError(domain: "XlsxImageExtractor", code: 18, userInfo: [
        NSLocalizedDescriptionKey: "Missing xl/workbook.xml",
      ])
    }

    guard let workbookRelsData = try readZipEntryData(xlsxURL: xlsxURL, entryPath: "xl/_rels/workbook.xml.rels") else {
      throw NSError(domain: "XlsxImageExtractor", code: 19, userInfo: [
        NSLocalizedDescriptionKey: "Missing xl/_rels/workbook.xml.rels",
      ])
    }

    let sheets = try parseWorkbookSheets(from: workbookData, context: "xl/workbook.xml")
    let relationships = try parseRelationships(from: workbookRelsData, context: "xl/_rels/workbook.xml.rels")

    guard let targetSheet = sheets.first(where: { $0.name == sheetName }) else {
      throw NSError(domain: "XlsxImageExtractor", code: 20, userInfo: [
        NSLocalizedDescriptionKey: "Sheet not found: \(sheetName)",
      ])
    }

    guard let relationship = relationships.first(where: { $0.id == targetSheet.relationshipId }) else {
      throw NSError(domain: "XlsxImageExtractor", code: 21, userInfo: [
        NSLocalizedDescriptionKey: "Worksheet relationship not found for sheet: \(sheetName)",
      ])
    }

    return resolveRelativePath(base: "xl/workbook.xml", target: relationship.target)
  }

  private func parseRelationships(from fileURL: URL) throws -> [ParsedRelationship] {
    guard let parser = XMLParser(contentsOf: fileURL) else { return [] }
    let delegate = RelationshipsParser()
    parser.delegate = delegate
    parser.shouldProcessNamespaces = false
    parser.shouldReportNamespacePrefixes = false
    parser.shouldResolveExternalEntities = false

    guard parser.parse() else {
      throw parser.parserError ?? NSError(
        domain: "XlsxImageExtractor",
        code: 3,
        userInfo: [NSLocalizedDescriptionKey: "Failed to parse relationships: \(fileURL.path)"]
      )
    }

    return delegate.relationships
  }

  private func parseWorkbookSheets(from fileURL: URL) throws -> [WorkbookSheetRef] {
    guard let parser = XMLParser(contentsOf: fileURL) else { return [] }
    let delegate = WorkbookSheetsParser()
    parser.delegate = delegate
    parser.shouldProcessNamespaces = false
    parser.shouldReportNamespacePrefixes = false
    parser.shouldResolveExternalEntities = false

    guard parser.parse() else {
      throw parser.parserError ?? NSError(
        domain: "XlsxImageExtractor",
        code: 4,
        userInfo: [NSLocalizedDescriptionKey: "Failed to parse workbook: \(fileURL.path)"]
      )
    }

    return delegate.sheets
  }

  private func parseDrawingAnchors(from fileURL: URL) throws -> [DrawingAnchor] {
    guard let parser = XMLParser(contentsOf: fileURL) else { return [] }
    let delegate = DrawingAnchorsParser()
    parser.delegate = delegate
    parser.shouldProcessNamespaces = false
    parser.shouldReportNamespacePrefixes = false
    parser.shouldResolveExternalEntities = false

    guard parser.parse() else {
      throw parser.parserError ?? NSError(
        domain: "XlsxImageExtractor",
        code: 5,
        userInfo: [NSLocalizedDescriptionKey: "Failed to parse drawing: \(fileURL.path)"]
      )
    }

    return delegate.anchors
  }

  private func worksheetRelationshipsPath(forWorksheetPath worksheetPath: String) -> String {
    let worksheetNSString = worksheetPath as NSString
    let directory = worksheetNSString.deletingLastPathComponent
    let file = worksheetNSString.lastPathComponent

    if directory.isEmpty {
      return "_rels/\(file).rels"
    }

    return "\(directory)/_rels/\(file).rels"
  }

  private func resolveRelativePath(base: String, target: String) -> String {
    let baseURL = URL(fileURLWithPath: "/\(base)")
    let normalizedTarget = target.hasPrefix("/") ? String(target.dropFirst()) : target
    let resolved = URL(fileURLWithPath: normalizedTarget, relativeTo: baseURL.deletingLastPathComponent())
      .standardizedFileURL
      .path

    return resolved.hasPrefix("/") ? String(resolved.dropFirst()) : resolved
  }

  private func normalizedLocalPath(_ path: String) -> String {
    if path.hasPrefix("file://"), let url = URL(string: path), url.isFileURL {
      return url.path
    }

    return path
  }
}
