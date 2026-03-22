import ExpoModulesCore
import Foundation
import UIKit

private let bookmarkCreationOptions: URL.BookmarkCreationOptions = {
#if os(iOS)
  return []
#else
  return [.withSecurityScope]
#endif
}()

private let bookmarkResolutionOptions: URL.BookmarkResolutionOptions = {
#if os(iOS)
  return [.withoutUI]
#else
  return [.withSecurityScope, .withoutUI]
#endif
}()

private final class DocumentPickerCoordinator: NSObject, UIDocumentPickerDelegate {
  var pendingPromise: Promise?

  private func copyPickedFileToCache(_ sourceUrl: URL) throws -> URL {
    let fileManager = FileManager.default
    let cachesDirectory = try fileManager.url(
      for: .cachesDirectory,
      in: .userDomainMask,
      appropriateFor: nil,
      create: true
    )
    let importsDirectory = cachesDirectory.appendingPathComponent("imports", isDirectory: true)
    try fileManager.createDirectory(at: importsDirectory, withIntermediateDirectories: true)

    let fileExtension = sourceUrl.pathExtension.isEmpty ? "xlsx" : sourceUrl.pathExtension
    let fileName = "import-\(UUID().uuidString).\(fileExtension)"
    let destinationUrl = importsDirectory.appendingPathComponent(fileName)

    if fileManager.fileExists(atPath: destinationUrl.path) {
      try fileManager.removeItem(at: destinationUrl)
    }

    try fileManager.copyItem(at: sourceUrl, to: destinationUrl)
    return destinationUrl
  }

  func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
    pendingPromise?.resolve(["canceled": true])
    pendingPromise = nil
  }

  func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
    defer { pendingPromise = nil }

    guard let promise = pendingPromise else {
      return
    }

    guard let url = urls.first else {
      promise.reject("PICKER_ERROR", "No file was selected")
      return
    }

    let accessed = url.startAccessingSecurityScopedResource()
    defer {
      if accessed {
        url.stopAccessingSecurityScopedResource()
      }
    }

    do {
      let localCopyUrl = try copyPickedFileToCache(url)
      let bookmarkData = try url.bookmarkData(
        options: bookmarkCreationOptions,
        includingResourceValuesForKeys: nil,
        relativeTo: nil
      )

      promise.resolve([
        "canceled": false,
        "path": localCopyUrl.path,
        "originalPath": url.path,
        "name": url.lastPathComponent,
        "bookmark": bookmarkData.base64EncodedString(),
      ])
    } catch {
      promise.reject("BOOKMARK_ERROR", "Failed to create bookmark from selected file")
    }
  }
}

public class FileBookmarkModule: Module {
  private let pickerCoordinator = DocumentPickerCoordinator()

  public func definition() -> ModuleDefinition {
    Name("FileBookmarkModule")

    AsyncFunction("createBookmark") { (filePath: String) -> String in
      let url = URL(fileURLWithPath: filePath)
      let data = try url.bookmarkData(
        options: bookmarkCreationOptions,
        includingResourceValuesForKeys: nil,
        relativeTo: nil
      )
      return data.base64EncodedString()
    }

    AsyncFunction("resolveBookmark") { (base64: String) -> [String: Any?] in
      guard let data = Data(base64Encoded: base64) else {
        throw NSError(domain: "Bookmark", code: 1, userInfo: [
          NSLocalizedDescriptionKey: "Invalid bookmark data",
        ])
      }

      var isStale = false
      let url = try URL(
        resolvingBookmarkData: data,
        options: bookmarkResolutionOptions,
        relativeTo: nil,
        bookmarkDataIsStale: &isStale
      )

      if isStale {
        NSLog("[FileBookmark] Resolved stale bookmark; continuing with resolved path")
      }

      let accessed = url.startAccessingSecurityScopedResource()
      defer {
        if accessed {
          url.stopAccessingSecurityScopedResource()
        }
      }

      let fileManager = FileManager.default
      let exists = fileManager.fileExists(atPath: url.path)
      var modTime: Double? = nil
      var fileSize: Int? = nil

      if exists {
        let attributes = try? fileManager.attributesOfItem(atPath: url.path)
        modTime = (attributes?[.modificationDate] as? Date)?.timeIntervalSince1970
        fileSize = attributes?[.size] as? Int
      }

      return [
        "path": url.path,
        "exists": exists,
        "modificationTime": modTime,
        "size": fileSize,
        "isStale": isStale,
      ]
    }

    AsyncFunction("pickExcelFileOpenInPlace") { (promise: Promise) in
      if self.pickerCoordinator.pendingPromise != nil {
        promise.reject("PICKER_BUSY", "A document picker request is already in progress")
        return
      }

      guard let presentingController = self.currentViewController() else {
        promise.reject("PICKER_ERROR", "No view controller available to present document picker")
        return
      }

      self.pickerCoordinator.pendingPromise = promise

      let documentTypes = [
        "org.openxmlformats.spreadsheetml.sheet",
        "com.microsoft.excel.xls",
        "public.spreadsheet",
      ]

      let picker = UIDocumentPickerViewController(documentTypes: documentTypes, in: .open)
      picker.delegate = self.pickerCoordinator
      picker.allowsMultipleSelection = false
      presentingController.present(picker, animated: true)
    }
    .runOnQueue(.main)
  }

  private func currentViewController() -> UIViewController? {
    let scenes = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap { $0.windows }
      .filter { $0.isKeyWindow }

    guard let root = scenes.first?.rootViewController else {
      return nil
    }

    var top = root
    while let presented = top.presentedViewController {
      top = presented
    }
    return top
  }
}
