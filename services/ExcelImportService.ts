import { createBookmark, resolveBookmark } from '../utils/FileBookmark';
import { Directory, File, Paths } from 'expo-file-system';
import { Settings } from '../models/Settings';
import { Platform } from 'react-native';
import ExcelReaderModule from '../modules/excel-reader';
import * as XLSX from 'xlsx';

import { db } from '../database/DatabaseService';

type NativeImageExtractionResult = {
  anchored: Record<string, string>;
  unanchored: string[];
};

type NativeSheetRow = {
  excelRow: number;
  values: any[];
};

type NativeRowChunkResult = {
  rows: NativeSheetRow[];
  nextStartRow: number;
  done: boolean;
};

type XlsxImageExtractorNativeModule = {
  extractImages: (
    filePath: string,
    sheetName: string | null
  ) => Promise<NativeImageExtractionResult>;
  listSheetNames?: (filePath: string) => Promise<string[]>;
  readSheetRowsChunk?: (
    filePath: string,
    sheetName: string,
    startRow: number,
    limit: number
  ) => Promise<NativeRowChunkResult>;
};

const xlsxImageExtractor = (Platform.OS === 'ios' ? ExcelReaderModule : undefined) as
  | XlsxImageExtractorNativeModule
  | undefined;

class ImageAssigner {
  private nextUnanchoredIndex = 0;
  private debugLoggedCount = 0;
  private readonly debugMaxLogs = 30;

  constructor(
    private readonly anchored: Record<string, string>,
    private readonly unanchored: string[]
  ) {}

  private logAssignment(
    excelRow: number,
    source: 'anchored' | 'unanchored' | 'none',
    path: string | null
  ) {
    if (this.debugLoggedCount >= this.debugMaxLogs) {
      return;
    }

    this.debugLoggedCount += 1;
  }

  get(excelRow: number): string | null {
    const anchoredPath = this.anchored[String(excelRow)];
    if (anchoredPath) {
      this.logAssignment(excelRow, 'anchored', anchoredPath);
      return anchoredPath;
    }

    if (this.nextUnanchoredIndex >= this.unanchored.length) {
      this.logAssignment(excelRow, 'none', null);
      return null;
    }

    const value = this.unanchored[this.nextUnanchoredIndex];
    this.nextUnanchoredIndex += 1;
    this.logAssignment(excelRow, 'unanchored', value);
    return value;
  }
}

export async function checkImportedFile(): Promise<boolean> {
  try {
    const { bookmark, modDate, fileSize } = await Settings.loadImportedFileBookmark();
    if (!bookmark) {
      return false;
    }
    const resolved = await resolveBookmark(bookmark);
    if (!resolved) {
      await Settings.clearImportedFileBookmark();
      return true;
    }

    if (!resolved.exists) {
      console.warn('Previously imported file no longer exists:', resolved.path);
      return true;
    }

    const newModDate = resolved.modificationTime ? Number(resolved.modificationTime) : 0;
    const newFileSize = resolved.size != null ? Number(resolved.size) : null;
    const changedByModDate = modDate !== null && newModDate > 0 && newModDate !== modDate;
    const changedBySize = fileSize !== null && newFileSize !== null && newFileSize !== fileSize;

    if (changedByModDate || changedBySize) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking imported file change:', error);
    return false;
  }
}

export async function getImportedFileFromBookmark(): Promise<SelectedImportFile | null> {
  try {
    const { bookmark } = await Settings.loadImportedFileBookmark();
    if (!bookmark) {
      return null;
    }

    const resolved = await resolveBookmark(bookmark);
    if (!resolved || !resolved.exists || !resolved.path) {
      return null;
    }

    const fileName = resolved.path.split('/').pop() || 'import.xlsx';

    return {
      uri: resolved.path,
      name: fileName,
      bookmark,
      sourcePath: resolved.path,
    };
  } catch (error) {
    console.error('Error resolving imported file from bookmark:', error);
    return null;
  }
}

interface ExcelStand {
  name: string;
  subtitle: string;
  icon: string;
  color: string;
  order_index: number;
}

interface ExcelShelfItem {
  name: string;
  image_path: string | null;
  order_index: number;
}

interface ExcelCustomer {
  name: string;
  order_index: number;
  group_name: string | null;
}

interface ImportOptions {
  includeImages?: boolean;
  progressMessages?: Partial<ImportProgressMessages>;
}

interface ImageBackupContext {
  originalRootPath: string;
  backupRootPath: string;
}

type ImportProgressMessageKey =
  | 'readingRowsFromSheet'
  | 'resolvingWorkbookSheets'
  | 'extractingStandImages'
  | 'extractingShelfImages'
  | 'skippingImageExtraction'
  | 'startingDatabaseTransaction'
  | 'clearingExistingData'
  | 'importingStandItems'
  | 'importingShelfItems'
  | 'importingCustomers'
  | 'finalizingImport'
  | 'importingStandItemRow'
  | 'importingShelfItemRow'
  | 'importingCustomerRow';

type ImportProgressMessages = Record<ImportProgressMessageKey, string>;

const DEFAULT_IMPORT_PROGRESS_MESSAGES: ImportProgressMessages = {
  readingRowsFromSheet: 'Reading rows from sheet...',
  resolvingWorkbookSheets: 'Resolving workbook sheets by name...',
  extractingStandImages: 'Extracting anchored images (Stand Items)...',
  extractingShelfImages: 'Extracting anchored images (Shelf Items)...',
  skippingImageExtraction: 'Skipping image extraction for faster import...',
  startingDatabaseTransaction: 'Starting database transaction...',
  clearingExistingData: 'Clearing existing data...',
  importingStandItems: 'Importing stand items...',
  importingShelfItems: 'Importing shelf items...',
  importingCustomers: 'Importing customers...',
  finalizingImport: 'Finalizing import...',
  importingStandItemRow: 'Importing stand item row {row}',
  importingShelfItemRow: 'Importing shelf item row {row}',
  importingCustomerRow: 'Importing customer row {row}',
};

const IMPORTED_EXCEL_IMAGES_DIR_NAME = 'imported_excel_images';

export interface ImportResult {
  success: boolean;
  reason?: 'invalid_file_type' | 'import_failed' | 'unexpected_error';
  error?: string;
  stats?: {
    standsCreated: number;
    standItems: number;
    shelfItems: number;
    customers: number;
  };
}

export interface SelectedImportFile {
  uri: string;
  name: string;
  bookmark?: string;
  sourcePath?: string;
}

type SupportedLanguage = 'en' | 'sr' | 'es';

interface ResolvedImportSheets {
  standItemsSheet: string;
  shelfItemsSheet: string;
  customersSheet: string;
  standConfigurationSheet?: string;
}

type StandConfigColumnKey = 'standName' | 'perRow';

const STAND_CONFIG_COL_INDEX = {
  standName: 0,
  perRow: 1,
} as const;

const STAND_CONFIG_SHEET_ALIASES = [
  'Stand Configuration',
  'stand_configuration',
  'stand_config',
  'stand setup',
  'stand settings',
  'konfiguracija standova',
  'konfiguracija_standova',
  'configuracion stands',
  'configuracion_stands',
];

const STAND_CONFIG_HEADER_ALIASES: HeaderAliasMap<StandConfigColumnKey> = {
  standName: [
    'stand_name',
    'stand name',
    'stand',
    'stand title',
    'štand',
    'naziv standa',
    'nombre stand',
    'nombre del stand',
  ],
  perRow: [
    'color_per_row',
    'color per row',
    'boja_po_redu',
    'boja po redu',
    'color_por_fila',
    'color por fila',
  ],
};

const STAND_COL_INDEX = {
  standName: 0,
  name: 1,
  colorNumber: 2,
  rowIndex: 3,
  colIndex: 4,
  colorOrder: 5,
  itemCode: 6,
} as const;

const SHELF_COL_INDEX = {
  name: 0,
} as const;

const CUSTOMER_COL_INDEX = {
  name: 0,
  group: -1,
} as const;

type StandColumnKey = keyof typeof STAND_COL_INDEX;
type ShelfColumnKey = keyof typeof SHELF_COL_INDEX;
type CustomerColumnKey = keyof typeof CUSTOMER_COL_INDEX;

type HeaderAliasMap<T extends string> = Record<T, string[]>;

const STAND_HEADER_ALIASES: HeaderAliasMap<StandColumnKey> = {
  standName: [
    'stand_name',
    'stand name',
    'stand',
    'stand title',
    'štand',
    'naziv standa',
    'standa',
    'nombre stand',
    'nombre del stand',
    'puesto',
  ],
  name: [
    'name',
    'item name',
    'article name',
    'naziv',
    'naziv artikla',
    'artikl',
    'nombre',
    'nombre articulo',
    'articulo',
  ],
  colorNumber: [
    'color_number',
    'color number',
    'color no',
    'broj boje',
    'boja broj',
    'numero boje',
    'numero de color',
  ],
  rowIndex: ['row_index', 'row index', 'row', 'red', 'red index', 'fila', 'indice fila'],
  colIndex: [
    'col_index',
    'col index',
    'column index',
    'column',
    'kolona',
    'kolona index',
    'columna',
    'indice columna',
  ],
  colorOrder: [
    'color_order',
    'color order',
    'redosled boje',
    'redosled boja',
    'orden color',
    'orden de color',
  ],
  itemCode: [
    'item_code',
    'item code',
    'code',
    'sifra artikla',
    'šifra artikla',
    'codigo artikla',
    'codigo articulo',
    'codigo',
  ],
};

const SHELF_HEADER_ALIASES: HeaderAliasMap<ShelfColumnKey> = {
  name: [
    'name',
    'item name',
    'article name',
    'naziv',
    'naziv artikla',
    'artikl',
    'nombre',
    'nombre articulo',
    'articulo',
  ],
};

const CUSTOMER_HEADER_ALIASES: HeaderAliasMap<CustomerColumnKey> = {
  name: ['name', 'customer name', 'customer', 'kupac', 'ime kupca', 'cliente', 'nombre cliente'],
  group: ['group', 'customer group', 'grupa', 'grupa kupca', 'grupo', 'grupo cliente'],
};

const TEMPLATE_HEADERS: Record<
  SupportedLanguage,
  {
    standItems: string[];
    shelfItems: string[];
    customers: string[];
  }
> = {
  en: {
    standItems: [
      'Stand Name',
      'Item Name',
      'Color Number',
      'Row',
      'Column',
      'Color Order',
      'Item Code',
      'Image',
    ],
    shelfItems: ['Item Name', 'Image'],
    customers: ['Customer Name', 'Group'],
  },
  sr: {
    standItems: [
      'Naziv Štanda',
      'Naziv Artikla',
      'Broj Boje',
      'Red',
      'Kolona',
      'Redosled Boje',
      'Šifra Artikla',
      'Slika',
    ],
    shelfItems: ['Naziv Artikla', 'Slika'],
    customers: ['Ime Kupca', 'Grupa'],
  },
  es: {
    standItems: [
      'Nombre del Stand',
      'Nombre Artículo',
      'Número de Color',
      'Fila',
      'Columna',
      'Orden de Color',
      'Código de Artículo',
      'Imagen',
    ],
    shelfItems: ['Nombre Artículo', 'Imagen'],
    customers: ['Nombre Cliente', 'Grupo'],
  },
};

export class ExcelImportService {
  private onProgress?: (message: string) => void;
  private progressMessages: ImportProgressMessages = DEFAULT_IMPORT_PROGRESS_MESSAGES;

  private readonly STAND_ITEMS_SHEET = 'Stand Items';
  private readonly SHELF_ITEMS_SHEET = 'Shelf Items';
  private readonly CUSTOMERS_SHEET = 'Customers';

  private getSupportedLanguage(language?: string | null): SupportedLanguage {
    if (language === 'sr' || language === 'es' || language === 'en') {
      return language;
    }
    return 'en';
  }

  private async getTemplateHeaderSet(language?: string): Promise<{
    standItems: string[];
    shelfItems: string[];
    customers: string[];
  }> {
    if (language) {
      return TEMPLATE_HEADERS[this.getSupportedLanguage(language)];
    }

    const settings = await Settings.load();
    return TEMPLATE_HEADERS[this.getSupportedLanguage(settings.language)];
  }

  private normalizeHeaderValue(value: unknown): string {
    return String(value ?? '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private parseStandPerRowFlag(value: unknown): boolean | null {
    const normalized = this.normalizeHeaderValue(value);
    if (normalized === 'yes' || normalized === 'da' || normalized === 'si') {
      return true;
    }

    if (normalized === 'no' || normalized === 'ne') {
      return false;
    }

    return null;
  }

  private resolveHeaderIndexes<T extends string>(
    headerRow: any[],
    aliases: HeaderAliasMap<T>,
    fallback: Record<T, number>
  ): { indexes: Record<T, number>; missing: T[] } {
    const normalizedHeaderIndex = new Map<string, number>();

    headerRow.forEach((cell, index) => {
      const normalized = this.normalizeHeaderValue(cell);
      if (!normalized) return;
      if (!normalizedHeaderIndex.has(normalized)) {
        normalizedHeaderIndex.set(normalized, index);
      }
    });

    const indexes = {} as Record<T, number>;
    const missing: T[] = [];

    (Object.keys(aliases) as T[]).forEach((key) => {
      const keyAliases = aliases[key];
      let resolvedIndex: number | undefined;

      for (const alias of keyAliases) {
        const normalizedAlias = this.normalizeHeaderValue(alias);
        const foundIndex = normalizedHeaderIndex.get(normalizedAlias);
        if (foundIndex !== undefined) {
          resolvedIndex = foundIndex;
          break;
        }
      }

      if (resolvedIndex === undefined) {
        resolvedIndex = fallback[key];
      }

      indexes[key] = resolvedIndex;

      if (resolvedIndex === undefined || resolvedIndex >= headerRow.length) {
        missing.push(key);
      }
    });

    return { indexes, missing };
  }

  private toLocalPath(uriOrPath: string): string {
    if (uriOrPath.startsWith('file://')) {
      return decodeURIComponent(uriOrPath.replace('file://', ''));
    }
    return uriOrPath;
  }

  private toFileUri(path: string): string {
    if (path.startsWith('file://')) return path;
    return `file://${path}`;
  }

  private isLikelyTemporaryImportPath(path: string): boolean {
    const normalized = path.toLowerCase();
    return normalized.includes('/library/caches/') || normalized.includes('/tmp/');
  }

  private setProgressMessages(progressMessages?: Partial<ImportProgressMessages>) {
    this.progressMessages = {
      ...DEFAULT_IMPORT_PROGRESS_MESSAGES,
      ...(progressMessages || {}),
    };
  }

  private emitProgress(
    key: ImportProgressMessageKey,
    values?: Record<string, string | number>
  ): void {
    const template = this.progressMessages[key] || DEFAULT_IMPORT_PROGRESS_MESSAGES[key];
    const message = values
      ? template.replace(/\{(\w+)\}/g, (_match, token) => String(values[token] ?? ''))
      : template;

    this.onProgress?.(message);
  }

  private async persistPickedFileUri(sourceUriOrPath: string): Promise<string> {
    const sourceUri = sourceUriOrPath.startsWith('file://')
      ? sourceUriOrPath
      : this.toFileUri(sourceUriOrPath);

    const cacheRoot = Paths.cache ?? Paths.document;
    const importsDir = new Directory(cacheRoot, 'imports');
    importsDir.create({ intermediates: true, idempotent: true });

    const token = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const destinationFile = new File(importsDir, `import-${token}.xlsx`);
    const sourceFile = new File(sourceUri);

    sourceFile.copy(destinationFile);

    const copiedInfo = destinationFile.info();
    if (!copiedInfo.exists) {
      throw new Error('Failed to copy selected file into app cache.');
    }

    return destinationFile.uri;
  }

  private cleanupCachedImportFile(fileUri?: string | null): void {
    if (!fileUri) {
      return;
    }

    try {
      const cachedFile = new File(fileUri);
      const info = cachedFile.info();
      if (info.exists) {
        cachedFile.delete();
      }
    } catch (cleanupError) {
      console.warn('Failed to cleanup cached import file:', cleanupError);
    }
  }

  private getImportedImagesRootPath(): string {
    const imagesRoot = new Directory(Paths.document, IMPORTED_EXCEL_IMAGES_DIR_NAME);
    return this.toLocalPath(imagesRoot.uri);
  }

  private async backupImportedImagesRoot(): Promise<ImageBackupContext | null> {
    const originalRootPath = this.getImportedImagesRootPath();
    const originalRootDir = new Directory(this.toFileUri(originalRootPath));
    const originalInfo = originalRootDir.info();
    if (!originalInfo.exists) {
      return null;
    }

    const backupRootDir = new Directory(Paths.cache ?? Paths.document, 'import-image-backups');
    backupRootDir.create({ intermediates: true, idempotent: true });

    const backupRunDir = new Directory(
      backupRootDir,
      `${IMPORTED_EXCEL_IMAGES_DIR_NAME}-${Date.now()}`
    );
    const backupRunInfo = backupRunDir.info();
    if (backupRunInfo.exists) {
      backupRunDir.delete();
    }

    originalRootDir.move(backupRunDir);

    return {
      originalRootPath,
      backupRootPath: this.toLocalPath(backupRunDir.uri),
    };
  }

  private async restoreBackedUpImages(backup: ImageBackupContext | null): Promise<void> {
    const currentRootPath = this.getImportedImagesRootPath();
    const currentRootDir = new Directory(this.toFileUri(currentRootPath));

    try {
      const currentInfo = currentRootDir.info();
      if (currentInfo.exists) {
        currentRootDir.delete();
      }
    } catch (error) {
      console.warn('Failed deleting extracted image root during rollback:', error);
    }

    if (!backup) {
      return;
    }

    const backupDir = new Directory(this.toFileUri(backup.backupRootPath));
    const backupInfo = backupDir.info();
    if (!backupInfo.exists) {
      return;
    }

    const restoreTargetDir = new Directory(this.toFileUri(backup.originalRootPath));
    backupDir.move(restoreTargetDir);
  }

  private async deleteBackupImages(backup: ImageBackupContext | null): Promise<void> {
    if (!backup) return;

    try {
      const backupDir = new Directory(this.toFileUri(backup.backupRootPath));
      const info = backupDir.info();
      if (info.exists) {
        backupDir.delete();
      }
    } catch (error) {
      console.warn('Failed deleting image backup directory:', error);
    }
  }

  private async extractSheetImages(
    xlsxPath: string,
    sheetName: string
  ): Promise<NativeImageExtractionResult> {
    if (Platform.OS !== 'ios' || !xlsxImageExtractor) {
      return { anchored: {}, unanchored: [] };
    }

    const response = await xlsxImageExtractor.extractImages(xlsxPath, sheetName);
    const normalized = {
      anchored: response?.anchored ?? {},
      unanchored: Array.isArray(response?.unanchored) ? response.unanchored : [],
    };

    return normalized;
  }

  private async readSheetRows(
    xlsxPath: string,
    sheetName: string,
    onRow: (row: any[], excelRow: number) => void
  ): Promise<void> {
    if (Platform.OS === 'ios' && xlsxImageExtractor?.readSheetRowsChunk) {
      let startRow = 1;
      const chunkLimit = 500;

      while (true) {
        const chunk = await xlsxImageExtractor.readSheetRowsChunk(
          xlsxPath,
          sheetName,
          startRow,
          chunkLimit
        );

        const rows = Array.isArray(chunk?.rows) ? chunk.rows : [];
        for (const rowEntry of rows) {
          onRow(rowEntry?.values ?? [], Number(rowEntry?.excelRow ?? 0));
        }

        if (chunk?.done) {
          break;
        }

        const nextStartRow = Number(chunk?.nextStartRow ?? startRow + chunkLimit);
        startRow =
          Number.isFinite(nextStartRow) && nextStartRow > startRow
            ? nextStartRow
            : startRow + chunkLimit;
      }

      return;
    }

    this.emitProgress('readingRowsFromSheet');
    const workbookBase64 = await new File(this.toFileUri(xlsxPath)).base64();
    const workbook = XLSX.read(workbookBase64, { type: 'base64' });
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      throw new Error(`Sheet not found: ${sheetName}`);
    }

    const rows = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      raw: true,
      blankrows: false,
      defval: null,
    }) as any[][];

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex] ?? [];
      onRow(row, rowIndex + 1);
    }
  }

  private async resolveImportSheets(xlsxPath: string): Promise<ResolvedImportSheets> {
    const getMatch = (sheetNames: string[], expectedName: string): string | null => {
      const exact = sheetNames.find((name) => name === expectedName);
      if (exact) return exact;

      const normalizedExpected = expectedName.trim().toLowerCase();
      const normalized = sheetNames.find(
        (name) => name.trim().toLowerCase() === normalizedExpected
      );
      return normalized ?? null;
    };

    let sheetNames: string[] = [];

    if (Platform.OS === 'ios' && xlsxImageExtractor?.listSheetNames) {
      const sheetNamesRaw = await xlsxImageExtractor.listSheetNames(xlsxPath);
      sheetNames = Array.isArray(sheetNamesRaw)
        ? sheetNamesRaw.filter((value): value is string => typeof value === 'string')
        : [];
    } else {
      const workbookBase64 = await new File(this.toFileUri(xlsxPath)).base64();
      const workbook = XLSX.read(workbookBase64, { type: 'base64', bookSheets: true });
      sheetNames = workbook.SheetNames || [];
    }

    const standItemsSheet = getMatch(sheetNames, this.STAND_ITEMS_SHEET);
    const shelfItemsSheet = getMatch(sheetNames, this.SHELF_ITEMS_SHEET);
    const customersSheet = getMatch(sheetNames, this.CUSTOMERS_SHEET);
    const standConfigurationSheet = STAND_CONFIG_SHEET_ALIASES.map((alias) =>
      getMatch(sheetNames, alias)
    ).find((name): name is string => Boolean(name));

    const missing: string[] = [];
    if (!standItemsSheet) missing.push(this.STAND_ITEMS_SHEET);
    if (!shelfItemsSheet) missing.push(this.SHELF_ITEMS_SHEET);
    if (!customersSheet) missing.push(this.CUSTOMERS_SHEET);

    if (missing.length > 0) {
      throw new Error(
        `Workbook is missing required sheet(s): ${missing.join(', ')}. Found: ${sheetNames.join(', ')}`
      );
    }

    return {
      standItemsSheet: standItemsSheet!,
      shelfItemsSheet: shelfItemsSheet!,
      customersSheet: customersSheet!,
      standConfigurationSheet,
    };
  }

  private async importStandConfiguration(
    xlsxPath: string,
    sheetName: string
  ): Promise<{ success: boolean; message: string; itemCount?: number }> {
    try {
      let headerError: string | null = null;
      let validationError: string | null = null;
      let standConfigColumnIndex: Record<StandConfigColumnKey, number> = {
        ...STAND_CONFIG_COL_INDEX,
      };
      const configByStand = new Map<string, 'per_sheet' | 'per_row'>();

      await this.readSheetRows(xlsxPath, sheetName, (row, excelRow) => {
        if (excelRow === 1) {
          const resolved = this.resolveHeaderIndexes(
            row,
            STAND_CONFIG_HEADER_ALIASES,
            STAND_CONFIG_COL_INDEX
          );
          standConfigColumnIndex = resolved.indexes;
          if (resolved.missing.length > 0) {
            headerError = `Missing required Stand Configuration column(s): ${resolved.missing.join(', ')}`;
          }
          return;
        }

        if (headerError || validationError) return;
        if (!row || row.length === 0) return;

        const standName = String(row[standConfigColumnIndex.standName] ?? '').trim();
        if (!standName) return;

        const rawValue = row[standConfigColumnIndex.perRow];
        const isPerRow = this.parseStandPerRowFlag(rawValue);
        if (isPerRow === null) {
          validationError =
            `Invalid Per Row value '${String(rawValue ?? '')}' for stand '${standName}' on row ${excelRow}. ` +
            `Use localized yes/no values only (en: yes/no, sr: da/ne, es: si/no).`;
          return;
        }

        const mode: 'per_sheet' | 'per_row' = isPerRow ? 'per_row' : 'per_sheet';
        configByStand.set(standName, mode);
      });

      if (headerError) {
        return { success: false, message: headerError };
      }

      if (validationError) {
        return { success: false, message: validationError };
      }

      let applied = 0;
      for (const [standName, mode] of configByStand.entries()) {
        const stand = await db.getStandByName(standName);
        if (!stand) continue;
        await db.updateStandColorHeadersModeByName(standName, mode);
        applied += 1;
      }

      return {
        success: true,
        message: `Imported stand configuration for ${applied} stand(s)`,
        itemCount: applied,
      };
    } catch (error) {
      console.error('Error importing stand configuration:', error);
      return {
        success: false,
        message: `Failed to import stand configuration: ${error}`,
      };
    }
  }

  /**
   * Import Excel file with three sheets.
   * UI concerns (file pickers/alerts) are handled by the caller.
   */
  async importFile(
    selectedFile: SelectedImportFile,
    onProgress?: (message: string) => void,
    options: ImportOptions = {}
  ): Promise<ImportResult> {
    let persistedUri: string | null = null;
    let imageBackup: ImageBackupContext | null = null;
    const includeImages = options.includeImages ?? false;

    try {
      this.onProgress = onProgress;
      this.setProgressMessages(options.progressMessages);

      persistedUri = await this.persistPickedFileUri(selectedFile.uri);
      const fileForImport: SelectedImportFile = {
        uri: persistedUri,
        name: selectedFile.name,
      };

      const xlsxPath = this.toLocalPath(fileForImport.uri);

      const isExcel = fileForImport.name.toLowerCase().endsWith('.xlsx');

      if (!isExcel) {
        return {
          success: false,
          reason: 'invalid_file_type',
        };
      }

      this.emitProgress('resolvingWorkbookSheets');
      const resolvedSheets = await this.resolveImportSheets(xlsxPath);

      let standImageMap: NativeImageExtractionResult = { anchored: {}, unanchored: [] };
      let shelfImageMap: NativeImageExtractionResult = { anchored: {}, unanchored: [] };

      if (includeImages) {
        imageBackup = await this.backupImportedImagesRoot();
        this.emitProgress('extractingStandImages');
        standImageMap = await this.extractSheetImages(xlsxPath, resolvedSheets.standItemsSheet);
        this.emitProgress('extractingShelfImages');
        shelfImageMap = await this.extractSheetImages(xlsxPath, resolvedSheets.shelfItemsSheet);
      } else {
        this.emitProgress('skippingImageExtraction');
      }

      // --- BEGIN TRANSACTION ---
      this.emitProgress('startingDatabaseTransaction');
      await db.beginTransaction();
      try {
        this.emitProgress('clearingExistingData');
        await db.clearAllData();

        this.emitProgress('importingStandItems');
        const standItemsResult = await this.importStandItemsWithStands(
          xlsxPath,
          resolvedSheets.standItemsSheet,
          new ImageAssigner(standImageMap.anchored, standImageMap.unanchored)
        );
        if (!standItemsResult.success) throw new Error(standItemsResult.message);
        const standItemsCount = standItemsResult.itemCount || 0;
        const standsCreated = standItemsResult.standsCount || 0;

        this.emitProgress('importingShelfItems');
        const shelfItemsResult = await this.importShelfItems(
          xlsxPath,
          resolvedSheets.shelfItemsSheet,
          new ImageAssigner(shelfImageMap.anchored, shelfImageMap.unanchored)
        );
        if (!shelfItemsResult.success) throw new Error(shelfItemsResult.message);
        const shelfItemsCount = shelfItemsResult.itemCount || 0;

        this.emitProgress('importingCustomers');
        const customersResult = await this.importCustomers(xlsxPath, resolvedSheets.customersSheet);
        if (!customersResult.success) throw new Error(customersResult.message);
        const customersCount = customersResult.itemCount || 0;

        if (resolvedSheets.standConfigurationSheet) {
          const standConfigResult = await this.importStandConfiguration(
            xlsxPath,
            resolvedSheets.standConfigurationSheet
          );
          if (!standConfigResult.success) throw new Error(standConfigResult.message);
        }

        this.emitProgress('finalizingImport');

        await db.commitTransaction();
        await this.deleteBackupImages(imageBackup);
        imageBackup = null;

        // Save bookmark and mod date for imported file
        try {
          const bookmarkPath = this.toLocalPath(selectedFile.sourcePath ?? selectedFile.uri);
          const bookmark = selectedFile.bookmark ?? (await createBookmark(bookmarkPath));
          if (!bookmark) {
            throw new Error('Failed to create bookmark for imported file');
          }
          const resolved = await resolveBookmark(bookmark);
          const modDate = resolved?.modificationTime ? Number(resolved.modificationTime) : 0;
          const fileSize = resolved?.size != null ? Number(resolved.size) : null;
          await Settings.saveImportedFileBookmark(bookmark, modDate, fileSize);
        } catch (bookmarkError) {
          console.error('Failed to bookmark imported file:', bookmarkError);
        }

        const message = [
          standsCreated > 0 ? `Created ${standsCreated} stands` : null,
          standItemsCount > 0 ? `Imported ${standItemsCount} stand items` : null,
          shelfItemsCount > 0 ? `Imported ${shelfItemsCount} shelf items` : null,
          customersCount > 0 ? `Imported ${customersCount} customers` : null,
        ]
          .filter(Boolean)
          .join(', ');

        return {
          success: true,
          stats: {
            standsCreated,
            standItems: standItemsCount,
            shelfItems: shelfItemsCount,
            customers: customersCount,
          },
        };
      } catch (error) {
        console.error('[Import] Import error, rolled back:', error);
        await db.rollbackTransaction();
        if (includeImages) {
          await this.restoreBackedUpImages(imageBackup);
        }
        return {
          success: false,
          reason: 'import_failed',
          error: error instanceof Error ? error.message : String(error),
        };
      }
    } catch (outerError) {
      console.error('[Import] Unexpected error:', outerError);
      if (includeImages) {
        await this.restoreBackedUpImages(imageBackup);
      }
      const message =
        outerError instanceof Error
          ? outerError.message
          : typeof outerError === 'string'
            ? outerError
            : 'Unknown error';
      return {
        success: false,
        reason: 'unexpected_error',
        error: message,
      };
    } finally {
      await this.deleteBackupImages(imageBackup);
      this.cleanupCachedImportFile(persistedUri);
    }
  }

  /**
   * Import stand items from Excel and create stands automatically
   * Expected columns: stand_name, name, color_number, row_index, col_index, item_code, image_path
   */
  private async importStandItemsWithStands(
    xlsxPath: string,
    sheetName: string,
    imageAssigner: ImageAssigner
  ): Promise<{
    success: boolean;
    message: string;
    itemCount?: number;
    standsCount?: number;
  }> {
    try {
      const standNames = new Set<string>();
      let policaItemsSkipped = 0;
      let headerError: string | null = null;
      let standColumnIndex: Record<StandColumnKey, number> = { ...STAND_COL_INDEX };

      await this.readSheetRows(xlsxPath, sheetName, (row, excelRow) => {
        if (excelRow === 1) {
          const resolved = this.resolveHeaderIndexes(row, STAND_HEADER_ALIASES, STAND_COL_INDEX);
          standColumnIndex = resolved.indexes;
          if (resolved.missing.length > 0) {
            headerError = `Missing required Stand Items column(s): ${resolved.missing.join(', ')}`;
          }
          return;
        }

        if (headerError) return;

        if (!row || row.length === 0) return;
        const standNameRaw = row[standColumnIndex.standName];
        if (standNameRaw === undefined || standNameRaw === null) return;

        const standName = String(standNameRaw).trim();
        if (!standName) return;

        if (standName.toLowerCase() === 'polica') {
          policaItemsSkipped += 1;
          return;
        }

        standNames.add(standName);
      });

      if (headerError) {
        return { success: false, message: headerError };
      }

      if (policaItemsSkipped > 0) {
        console.warn(`Skipped ${policaItemsSkipped} item(s) with stand name 'Polica'`);
      }

      // Create stands for unique names
      const standsToCreate: Omit<ExcelStand, 'id'>[] = [];
      let orderIndex = 1;
      for (const standName of Array.from(standNames).sort()) {
        // Check if stand already exists
        const existingStand = await db.getStandByName(standName);
        if (!existingStand) {
          standsToCreate.push({
            name: standName,
            subtitle: standName,
            icon: 'albums-outline',
            color: this.getStandColor(orderIndex),
            order_index: orderIndex,
          });
          orderIndex++;
        }
      }

      // Import stands
      if (standsToCreate.length > 0) {
        await db.importStands(standsToCreate);
      }

      const allStands = await db.getAllStands();
      const standIdByName = new Map<string, number>(
        allStands.map((stand) => [stand.name, stand.id])
      );

      const chunkSize = 300;
      let chunk: Omit<any, 'id'>[] = [];
      let importedCount = 0;
      let totalRows = 0;

      const flushChunk = async () => {
        if (chunk.length === 0) return;
        await db.importStandItems(chunk as any);
        importedCount += chunk.length;
        chunk = [];
      };

      let validationError: string | null = null;

      await this.readSheetRows(xlsxPath, sheetName, (row, excelRow) => {
        if (excelRow === 1) {
          const resolved = this.resolveHeaderIndexes(row, STAND_HEADER_ALIASES, STAND_COL_INDEX);
          standColumnIndex = resolved.indexes;
          if (resolved.missing.length > 0) {
            validationError = `Missing required Stand Items column(s): ${resolved.missing.join(', ')}`;
          }
          return;
        }

        totalRows += 1;
        if (!row || row.length === 0 || validationError) return;

        this.emitProgress('importingStandItemRow', { row: totalRows });

        const standName = String(row[standColumnIndex.standName] ?? '').trim();
        if (!standName) return;
        if (standName.toLowerCase() === 'polica') return;

        const standId = standIdByName.get(standName);
        if (!standId) {
          const itemName = String(row[standColumnIndex.name] ?? '').trim();
          console.warn(`Stand not found: ${standName} (skipping item: ${itemName})`);
          return;
        }

        const itemName = String(row[standColumnIndex.name] ?? '').trim();
        const colorNumberRaw = row[standColumnIndex.colorNumber];
        const itemCodeRaw = row[standColumnIndex.itemCode];

        const rowIndexRaw = row[standColumnIndex.rowIndex];
        const colIndexRaw = row[standColumnIndex.colIndex];
        const colorOrderRaw = row[standColumnIndex.colorOrder];

        const hasLayoutValues =
          rowIndexRaw !== undefined &&
          rowIndexRaw !== null &&
          String(rowIndexRaw).trim() !== '' &&
          colIndexRaw !== undefined &&
          colIndexRaw !== null &&
          String(colIndexRaw).trim() !== '' &&
          colorOrderRaw !== undefined &&
          colorOrderRaw !== null &&
          String(colorOrderRaw).trim() !== '';

        const hasItemData =
          itemName.length > 0 ||
          (colorNumberRaw !== undefined &&
            colorNumberRaw !== null &&
            String(colorNumberRaw).trim() !== '') ||
          (itemCodeRaw !== undefined && itemCodeRaw !== null && String(itemCodeRaw).trim() !== '');

        // Some templates include stand separator rows in Sheet 1 with no item/layout data.
        // Ignore these rows instead of failing the entire import.
        if (!hasLayoutValues && !hasItemData) {
          return;
        }

        const rowIndexInput = parseInt(String(rowIndexRaw));
        const colIndexInput = parseInt(String(colIndexRaw));
        const colorOrderInput = parseInt(String(colorOrderRaw));

        if (isNaN(rowIndexInput) || rowIndexInput < 1) {
          validationError = `Invalid row_index at Excel row ${excelRow}: ${rowIndexRaw}. Must be >= 1.`;
          return;
        }
        if (isNaN(colIndexInput) || colIndexInput < 1) {
          validationError = `Invalid col_index at Excel row ${excelRow}: ${colIndexRaw}. Must be >= 1.`;
          return;
        }
        if (isNaN(colorOrderInput) || colorOrderInput < 1) {
          validationError = `Invalid color_order at Excel row ${excelRow}: ${colorOrderRaw}. Must be >= 1.`;
          return;
        }

        const extractedPath = imageAssigner.get(excelRow);

        chunk.push({
          stand_id: standId,
          name: itemName,
          color_number: row[standColumnIndex.colorNumber]
            ? String(row[standColumnIndex.colorNumber])
            : null,
          row_index: rowIndexInput - 1,
          col_index: colIndexInput - 1,
          item_code: row[standColumnIndex.itemCode] ? String(row[standColumnIndex.itemCode]) : null,
          image_path: extractedPath ? this.toFileUri(extractedPath) : null,
          color_order: colorOrderInput,
        });
      });

      if (validationError) {
        return { success: false, message: validationError };
      }

      while (chunk.length >= chunkSize) {
        const batch = chunk.splice(0, chunkSize);
        await db.importStandItems(batch as any);
        importedCount += batch.length;
      }

      await flushChunk();

      return {
        success: true,
        message: `Created ${standsToCreate.length} stands, imported ${importedCount} items`,
        itemCount: importedCount,
        standsCount: standsToCreate.length,
      };
    } catch (error) {
      console.error('Error importing stand items:', error);
      return {
        success: false,
        message: `Failed to import stand items: ${error}`,
      };
    }
  }

  /**
   * Get color for a stand based on its order
   */
  private getStandColor(orderIndex: number): string {
    const colors = [
      '#007AFF', // Blue
      '#34C759', // Green
      '#FF9500', // Orange
      '#FF3B30', // Red
      '#AF52DE', // Purple
      '#FF2D55', // Pink
      '#5856D6', // Indigo
      '#FFD60A', // Yellow
      '#64D2FF', // Light Blue
      '#BF5AF2', // Violet
    ];
    return colors[(orderIndex - 1) % colors.length];
  }

  /**
   * Import shelf items from Excel
   * Expected columns: name, image_path
   * Item order is derived from row order in the file.
   */
  private async importShelfItems(
    xlsxPath: string,
    sheetName: string,
    imageAssigner: ImageAssigner
  ): Promise<{ success: boolean; message: string; itemCount?: number }> {
    try {
      const items: Omit<ExcelShelfItem, 'id'>[] = [];
      let validationError: string | null = null;
      let totalRows = 0;
      let shelfColumnIndex: Record<ShelfColumnKey, number> = { ...SHELF_COL_INDEX };

      await this.readSheetRows(xlsxPath, sheetName, (row, excelRow) => {
        if (excelRow === 1) {
          const resolved = this.resolveHeaderIndexes(row, SHELF_HEADER_ALIASES, SHELF_COL_INDEX);
          shelfColumnIndex = resolved.indexes;
          if (resolved.missing.length > 0) {
            validationError = `Missing required Shelf Items column(s): ${resolved.missing.join(', ')}`;
          }
          return;
        }

        totalRows += 1;
        if (!row || row.length === 0 || validationError) return;

        this.emitProgress('importingShelfItemRow', { row: totalRows });

        const extractedPath = imageAssigner.get(excelRow);
        items.push({
          name: String(row[shelfColumnIndex.name] ?? ''),
          image_path: extractedPath ? this.toFileUri(extractedPath) : null,
          order_index: items.length,
        });
      });

      if (validationError) {
        return {
          success: false,
          message: validationError,
        };
      }

      await db.importShelfItems(items);
      return {
        success: true,
        message: `Imported ${items.length} shelf items`,
        itemCount: items.length,
      };
    } catch (error) {
      console.error('Error importing shelf items:', error);
      return {
        success: false,
        message: `Failed to import shelf items: ${error}`,
      };
    }
  }

  /**
   * Import customers from Excel
   * Expected columns: name
   * Optional columns: group
   * Customer order is derived from row order in the file.
   */
  private async importCustomers(
    xlsxPath: string,
    sheetName: string
  ): Promise<{ success: boolean; message: string; itemCount?: number }> {
    try {
      const customers: Omit<ExcelCustomer, 'id'>[] = [];

      let validationError: string | null = null;
      let totalRows = 0;
      let customerColumnIndex: Record<CustomerColumnKey, number> = { ...CUSTOMER_COL_INDEX };

      await this.readSheetRows(xlsxPath, sheetName, (row, excelRow) => {
        if (excelRow === 1) {
          const resolved = this.resolveHeaderIndexes(
            row,
            CUSTOMER_HEADER_ALIASES,
            CUSTOMER_COL_INDEX
          );
          customerColumnIndex = resolved.indexes;
          if (resolved.missing.length > 0) {
            validationError = `Missing required Customers column(s): ${resolved.missing.join(', ')}`;
          }
          return;
        }

        totalRows += 1;
        if (!row || row.length === 0 || validationError) return;

        this.emitProgress('importingCustomerRow', { row: totalRows });

        customers.push({
          name: String(row[customerColumnIndex.name] ?? '').trim(),
          order_index: customers.length,
          group_name: String(row[customerColumnIndex.group] ?? '').trim() || null,
        });
      });

      if (validationError) {
        return {
          success: false,
          message: validationError,
        };
      }

      await db.importCustomers(customers);
      return {
        success: true,
        message: `Imported ${customers.length} customers`,
        itemCount: customers.length,
      };
    } catch (error) {
      console.error('Error importing customers:', error);
      return {
        success: false,
        message: `Failed to import customers: ${error}`,
      };
    }
  }

  /**
   * Generate example Excel file with four sheets
   * Sheet 1: Stand Items
   * Sheet 2: Shelf Items
   * Sheet 3: Customers
   * Sheet 4: Stand Configuration (export rendering mode)
   */
  async generateExampleFiles(language?: string): Promise<{
    success: boolean;
    message: string;
    files?: { template: string };
  }> {
    try {
      const headers = await this.getTemplateHeaderSet(language);
      const exportDir = new Directory(Paths.document, 'example_templates');
      exportDir.create({ intermediates: true, idempotent: true });

      // Create a single workbook with four sheets (headers only, no data rows)
      const workbook = XLSX.utils.book_new();

      // Sheet 1: Stand Items (headers only)
      const standItemsData: any[][] = [headers.standItems];
      const standItemsWorksheet = XLSX.utils.aoa_to_sheet(standItemsData);
      standItemsWorksheet['!cols'] = [
        { wch: 12 }, // stand_name
        { wch: 20 }, // name
        { wch: 12 }, // color_number
        { wch: 10 }, // row_index
        { wch: 10 }, // col_index
        { wch: 12 }, // color_order
        { wch: 12 }, // item_code
        { wch: 30 }, // image_path
      ];
      // Freeze the first row (header)
      standItemsWorksheet['!freeze'] = { rows: 1 };
      XLSX.utils.book_append_sheet(workbook, standItemsWorksheet, 'Stand Items');

      // Sheet 2: Shelf Items (headers only)
      const shelfItemsData: any[][] = [headers.shelfItems];
      const shelfItemsWorksheet = XLSX.utils.aoa_to_sheet(shelfItemsData);
      shelfItemsWorksheet['!cols'] = [
        { wch: 25 }, // name
        { wch: 30 }, // image_path
      ];
      // Freeze the first row (header)
      shelfItemsWorksheet['!freeze'] = { rows: 1 };
      XLSX.utils.book_append_sheet(workbook, shelfItemsWorksheet, 'Shelf Items');

      // Sheet 3: Customers (headers only)
      const customersData = [headers.customers];
      const customersWorksheet = XLSX.utils.aoa_to_sheet(customersData);
      customersWorksheet['!cols'] = [
        { wch: 30 }, // name
        { wch: 20 }, // group
      ];
      // Freeze the first row (header)
      customersWorksheet['!freeze'] = { rows: 1 };
      XLSX.utils.book_append_sheet(workbook, customersWorksheet, 'Customers');

      // Sheet 4: Stand Configuration (headers only)
      const standConfigData = [['Stand Name', 'Per Row']];
      const standConfigWorksheet = XLSX.utils.aoa_to_sheet(standConfigData);
      standConfigWorksheet['!cols'] = [
        { wch: 30 }, // stand name
        { wch: 20 }, // mode
      ];
      standConfigWorksheet['!freeze'] = { rows: 1 };
      XLSX.utils.book_append_sheet(workbook, standConfigWorksheet, 'Stand Configuration');

      // Write the workbook
      const base64 = XLSX.write(workbook, {
        type: 'base64',
        bookType: 'xlsx',
      });
      const templateFile = new File(exportDir, 'inventory_import_template.xlsx');
      templateFile.write(base64, { encoding: 'base64' });
      const templatePath = templateFile.uri;

      return {
        success: true,
        message: `Empty template file generated successfully`,
        files: {
          template: templatePath,
        },
      };
    } catch (error) {
      console.error('Error generating empty template:', error);
      return {
        success: false,
        message: `Failed to generate empty template: ${error}`,
      };
    }
  }
}

export const excelImport = new ExcelImportService();
