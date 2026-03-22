jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

jest.mock('expo-file-system', () => {
  class Directory {
    uri: string;

    constructor(rootOrUri: string, name?: string) {
      this.uri = name ? `${rootOrUri}/${name}` : rootOrUri;
    }

    create() {}
    info() {
      return { exists: false };
    }
    delete() {}
    move() {}
  }

  class File {
    uri: string;

    constructor(parentOrUri: any, name?: string) {
      if (typeof parentOrUri === 'string' && name === undefined) {
        this.uri = parentOrUri;
      } else {
        const base = typeof parentOrUri === 'string' ? parentOrUri : parentOrUri.uri;
        this.uri = `${base}/${name}`;
      }
    }

    copy() {}
    info() {
      return { exists: true };
    }
    delete() {}
    base64() {
      return Promise.resolve('');
    }
    write() {}
  }

  return {
    Directory,
    File,
    Paths: {
      cache: '/cache',
      document: '/document',
    },
  };
});

jest.mock('../../src/database/DatabaseService', () => ({
  db: {
    beginTransaction: jest.fn(),
    clearAllData: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
  },
}));

jest.mock('../../src/modules/excel-reader', () => ({
  __esModule: true,
  default: {},
}));

jest.mock('../../src/models/Settings', () => ({
  Settings: {
    load: jest.fn(),
    loadImportedFileBookmark: jest.fn(),
    saveImportedFileBookmark: jest.fn(),
  },
}));

jest.mock('../../src/utils/FileBookmark', () => ({
  createBookmark: jest.fn(),
  resolveBookmark: jest.fn(),
}));

import { Settings } from '../../src/models/Settings';
import { resolveBookmark } from '../../src/utils/FileBookmark';
import {
  checkImportedFile,
  getImportedFileFromBookmark,
  normalizeHeaderValue,
  parseStandPerRowFlag,
  getSupportedLanguage,
  resolveHeaderIndexes,
} from '../../src/services/ExcelImportService';

describe('ExcelImportService import helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns unchanged when there is no saved bookmark', async () => {
    (Settings.loadImportedFileBookmark as jest.Mock).mockResolvedValue({
      bookmark: null,
      modDate: null,
      fileSize: null,
    });

    await expect(checkImportedFile()).resolves.toBe('unchanged');
    expect(resolveBookmark).not.toHaveBeenCalled();
  });

  it('returns missing when bookmark cannot be resolved', async () => {
    (Settings.loadImportedFileBookmark as jest.Mock).mockResolvedValue({
      bookmark: 'bookmark-token',
      modDate: 100,
      fileSize: 1000,
    });
    (resolveBookmark as jest.Mock).mockResolvedValue(null);

    await expect(checkImportedFile()).resolves.toBe('missing');
  });

  it('returns changed when file metadata differs', async () => {
    (Settings.loadImportedFileBookmark as jest.Mock).mockResolvedValue({
      bookmark: 'bookmark-token',
      modDate: 100,
      fileSize: 1000,
    });
    (resolveBookmark as jest.Mock).mockResolvedValue({
      exists: true,
      path: '/tmp/import.xlsx',
      modificationTime: 200,
      size: 1000,
    });

    await expect(checkImportedFile()).resolves.toBe('changed');
  });

  it('returns file metadata from bookmark resolution', async () => {
    (Settings.loadImportedFileBookmark as jest.Mock).mockResolvedValue({
      bookmark: 'bookmark-token',
    });
    (resolveBookmark as jest.Mock).mockResolvedValue({
      exists: true,
      path: '/tmp/orders/new-import.xlsx',
    });

    await expect(getImportedFileFromBookmark()).resolves.toEqual({
      uri: '/tmp/orders/new-import.xlsx',
      name: 'new-import.xlsx',
      bookmark: 'bookmark-token',
      sourcePath: '/tmp/orders/new-import.xlsx',
    });
  });

  it('returns null when bookmark file no longer exists', async () => {
    (Settings.loadImportedFileBookmark as jest.Mock).mockResolvedValue({
      bookmark: 'bookmark-token',
    });
    (resolveBookmark as jest.Mock).mockResolvedValue({
      exists: false,
      path: '/tmp/orders/new-import.xlsx',
    });

    await expect(getImportedFileFromBookmark()).resolves.toBeNull();
  });
});

describe('normalizeHeaderValue', () => {
  it('trims and lowercases', () => {
    expect(normalizeHeaderValue('  Stand Name  ')).toBe('stand_name');
  });

  it('strips diacritics', () => {
    expect(normalizeHeaderValue('štand')).toBe('stand');
    expect(normalizeHeaderValue('šifra artikla')).toBe('sifra_artikla');
    expect(normalizeHeaderValue('Número de Color')).toBe('numero_de_color');
  });

  it('replaces non-alphanumeric sequences with a single underscore', () => {
    expect(normalizeHeaderValue('color number')).toBe('color_number');
    expect(normalizeHeaderValue('color-number')).toBe('color_number');
    expect(normalizeHeaderValue('a--b')).toBe('a_b');
  });

  it('strips leading and trailing underscores', () => {
    expect(normalizeHeaderValue(' _name_ ')).toBe('name');
  });

  it('returns empty string for null, undefined, and empty input', () => {
    expect(normalizeHeaderValue(null)).toBe('');
    expect(normalizeHeaderValue(undefined)).toBe('');
    expect(normalizeHeaderValue('')).toBe('');
  });

  it('converts numbers to their string representation', () => {
    expect(normalizeHeaderValue(42)).toBe('42');
  });
});

describe('parseStandPerRowFlag', () => {
  it.each([
    ['yes', true],
    ['da', true],
    ['si', true],
    ['YES', true],
    ['DA', true],
    ['SI', true],
  ])('treats %s as per-row (true)', (input, expected) => {
    expect(parseStandPerRowFlag(input)).toBe(expected);
  });

  it.each([
    ['no', false],
    ['ne', false],
    ['NO', false],
    ['NE', false],
  ])('treats %s as per-sheet (false)', (input, expected) => {
    expect(parseStandPerRowFlag(input)).toBe(expected);
  });

  it('returns null for unrecognized values', () => {
    expect(parseStandPerRowFlag('')).toBeNull();
    expect(parseStandPerRowFlag('maybe')).toBeNull();
    expect(parseStandPerRowFlag(null)).toBeNull();
    expect(parseStandPerRowFlag(undefined)).toBeNull();
  });
});

describe('getSupportedLanguage', () => {
  it.each(['en', 'sr', 'es'] as const)('returns %s unchanged', (lang) => {
    expect(getSupportedLanguage(lang)).toBe(lang);
  });

  it.each(['fr', 'de', 'zh', ''])('defaults %s to en', (lang) => {
    expect(getSupportedLanguage(lang)).toBe('en');
  });

  it('defaults null and undefined to en', () => {
    expect(getSupportedLanguage(null)).toBe('en');
    expect(getSupportedLanguage(undefined)).toBe('en');
  });
});

describe('resolveHeaderIndexes', () => {
  const aliases = {
    name: ['name', 'item name', 'naziv'],
    code: ['code', 'item_code'],
  };
  const fallback = { name: 0, code: 1 };

  it('resolves headers by exact (normalized) alias match', () => {
    const { indexes, missing } = resolveHeaderIndexes(['Name', 'Code'], aliases, fallback);
    expect(indexes.name).toBe(0);
    expect(indexes.code).toBe(1);
    expect(missing).toHaveLength(0);
  });

  it('resolves headers using multi-word aliases', () => {
    const { indexes } = resolveHeaderIndexes(['Item Name', 'Item Code'], aliases, fallback);
    expect(indexes.name).toBe(0);
    expect(indexes.code).toBe(1);
  });

  it('resolves headers with diacritics stripped', () => {
    const { indexes } = resolveHeaderIndexes(['naziv', 'code'], aliases, fallback);
    expect(indexes.name).toBe(0);
  });

  it('falls back to positional index when no alias matches', () => {
    const { indexes } = resolveHeaderIndexes(
      ['Unknown A', 'Unknown B', 'Unknown C'],
      aliases,
      fallback
    );
    expect(indexes.name).toBe(0);
    expect(indexes.code).toBe(1);
  });

  it('reports a column as missing when its resolved index is out of bounds', () => {
    // header row has only 1 column; fallback for code is 1 which is >= length 1
    const { missing } = resolveHeaderIndexes(['Only'], aliases, fallback);
    expect(missing).toContain('code');
    expect(missing).not.toContain('name');
  });
});

describe('checkImportedFile – additional edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns unchanged when file exists and metadata matches exactly', async () => {
    (Settings.loadImportedFileBookmark as jest.Mock).mockResolvedValue({
      bookmark: 'token',
      modDate: 1000,
      fileSize: 2048,
    });
    (resolveBookmark as jest.Mock).mockResolvedValue({
      exists: true,
      path: '/tmp/import.xlsx',
      modificationTime: 1000,
      size: 2048,
    });
    await expect(checkImportedFile()).resolves.toBe('unchanged');
  });

  it('returns changed when only file size differs', async () => {
    (Settings.loadImportedFileBookmark as jest.Mock).mockResolvedValue({
      bookmark: 'token',
      modDate: 1000,
      fileSize: 1024,
    });
    (resolveBookmark as jest.Mock).mockResolvedValue({
      exists: true,
      path: '/tmp/import.xlsx',
      modificationTime: 1000,
      size: 2048,
    });
    await expect(checkImportedFile()).resolves.toBe('changed');
  });

  it('returns missing when resolved file exists flag is false', async () => {
    (Settings.loadImportedFileBookmark as jest.Mock).mockResolvedValue({
      bookmark: 'token',
      modDate: 100,
      fileSize: 1000,
    });
    (resolveBookmark as jest.Mock).mockResolvedValue({ exists: false });
    await expect(checkImportedFile()).resolves.toBe('missing');
  });

  it('returns unchanged when stored modDate and fileSize are null', async () => {
    (Settings.loadImportedFileBookmark as jest.Mock).mockResolvedValue({
      bookmark: 'token',
      modDate: null,
      fileSize: null,
    });
    (resolveBookmark as jest.Mock).mockResolvedValue({
      exists: true,
      modificationTime: 9999,
      size: 9999,
    });
    await expect(checkImportedFile()).resolves.toBe('unchanged');
  });

  it('returns unchanged on unexpected error', async () => {
    (Settings.loadImportedFileBookmark as jest.Mock).mockRejectedValue(
      new Error('storage failure')
    );
    await expect(checkImportedFile()).resolves.toBe('unchanged');
  });
});

describe('getImportedFileFromBookmark – additional edge cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns null when no bookmark is stored', async () => {
    (Settings.loadImportedFileBookmark as jest.Mock).mockResolvedValue({ bookmark: null });
    await expect(getImportedFileFromBookmark()).resolves.toBeNull();
  });

  it('returns null when resolveBookmark returns null', async () => {
    (Settings.loadImportedFileBookmark as jest.Mock).mockResolvedValue({
      bookmark: 'token',
    });
    (resolveBookmark as jest.Mock).mockResolvedValue(null);
    await expect(getImportedFileFromBookmark()).resolves.toBeNull();
  });

  it('returns null on unexpected error', async () => {
    (Settings.loadImportedFileBookmark as jest.Mock).mockRejectedValue(
      new Error('storage failure')
    );
    await expect(getImportedFileFromBookmark()).resolves.toBeNull();
  });
});
