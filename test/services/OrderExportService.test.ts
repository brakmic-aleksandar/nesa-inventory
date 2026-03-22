const mockCreate = jest.fn();
const mockWrite = jest.fn();

jest.mock('expo-file-system', () => {
  class Directory {
    uri: string;

    constructor(rootOrUri: string | { uri: string }, name?: string) {
      const base = typeof rootOrUri === 'string' ? rootOrUri : rootOrUri.uri;
      this.uri = name ? `${base}/${name}` : base;
    }

    create(options: any) {
      mockCreate(options);
    }
  }

  class File {
    uri: string;

    constructor(parentOrUri: string | { uri: string }, name?: string) {
      if (typeof parentOrUri === 'string' && name === undefined) {
        this.uri = parentOrUri;
      } else {
        const base = typeof parentOrUri === 'string' ? parentOrUri : parentOrUri.uri;
        this.uri = `${base}/${name}`;
      }
    }

    write(content: string, options: any) {
      mockWrite(content, options);
    }
  }

  return {
    Directory,
    File,
    Paths: {
      cache: '/cache-root',
      document: '/document-root',
    },
  };
});

jest.mock('../../src/database/DatabaseService', () => ({
  db: {
    getAllStands: jest.fn().mockResolvedValue([]),
    getAllShelfItems: jest.fn().mockResolvedValue([]),
    getStandItems: jest.fn().mockResolvedValue([]),
  },
}));

jest.mock('exceljs', () => ({
  __esModule: true,
  default: {
    Workbook: class Workbook {
      addWorksheet() {
        return {
          addRow: () => ({ eachCell: () => undefined }),
          columns: [],
        };
      }
    },
  },
}));

import {
  OrderExportService,
  joinColorNames,
  splitColorGroups,
  buildColorColumnsWithGaps,
  truncateSheetName,
  getColorOrderKey,
} from '../../src/services/OrderExportService';

describe('OrderExportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('writes workbook as base64 file and returns output URI', async () => {
    const service = new OrderExportService();
    const workbook = {
      xlsx: {
        writeBuffer: jest.fn().mockResolvedValue(new Uint8Array([65, 66, 67]).buffer),
      },
    } as any;

    const uri = await service.writeWorkbookToFile(workbook, 'order.xlsx');

    expect(uri).toBe('/cache-root/exports/order.xlsx');
    expect(mockCreate).toHaveBeenCalledWith({ intermediates: true, idempotent: true });
    expect(mockWrite).toHaveBeenCalledWith('QUJD', { encoding: 'base64' });
  });

  it('generates a single order export using localized file prefix', async () => {
    const service = new OrderExportService();
    const populateSpy = jest.spyOn(service, 'populateWorkbook').mockResolvedValue(undefined);
    const writeSpy = jest.spyOn(service, 'writeWorkbookToFile').mockResolvedValue('/tmp/a.xlsx');
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);

    const uri = await service.generateExcelFile('Alice', [], 'en');

    expect(uri).toBe('/tmp/a.xlsx');
    expect(populateSpy).toHaveBeenCalledTimes(1);
    expect(writeSpy).toHaveBeenCalledTimes(1);
    expect(writeSpy).toHaveBeenCalledWith(expect.anything(), 'order_Alice_1700000000000.xlsx');
  });

  it('generates one file per order in batch export', async () => {
    const service = new OrderExportService();
    const populateSpy = jest.spyOn(service, 'populateWorkbook').mockResolvedValue(undefined);
    const writeSpy = jest
      .spyOn(service, 'writeWorkbookToFile')
      .mockResolvedValueOnce('/tmp/1.xlsx')
      .mockResolvedValueOnce('/tmp/2.xlsx');
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);

    const result = await service.generateBatchExcelFiles(
      [
        { customerName: 'Alice', items: [] },
        { customerName: 'Bob', items: [] },
      ],
      'en'
    );

    expect(result).toEqual(['/tmp/1.xlsx', '/tmp/2.xlsx']);
    expect(populateSpy).toHaveBeenCalledTimes(2);
    expect(writeSpy).toHaveBeenCalledTimes(2);
  });
});

describe('joinColorNames', () => {
  it('joins names with a slash', () => {
    expect(joinColorNames(['ROJO', 'AZUL', 'VERDE'])).toBe('ROJO/AZUL/VERDE');
  });

  it('deduplicates identical names', () => {
    expect(joinColorNames(['ROJO', 'ROJO', 'AZUL'])).toBe('ROJO/AZUL');
  });

  it('trims surrounding whitespace from each name', () => {
    expect(joinColorNames([' ROJO ', ' AZUL'])).toBe('ROJO/AZUL');
  });

  it('ignores empty or whitespace-only entries', () => {
    expect(joinColorNames(['', 'ROJO', '   '])).toBe('ROJO');
  });

  it('returns empty string for an empty iterable', () => {
    expect(joinColorNames([])).toBe('');
  });

  it('accepts any Iterable (e.g. a Set)', () => {
    expect(joinColorNames(new Set(['A', 'B', 'A']))).toBe('A/B');
  });
});

describe('getColorOrderKey', () => {
  it('returns empty string for undefined', () => {
    expect(getColorOrderKey(undefined)).toBe('');
  });

  it('returns the string "null" for null', () => {
    expect(getColorOrderKey(null)).toBe('null');
  });

  it('stringifies numbers', () => {
    expect(getColorOrderKey(5)).toBe('5');
    expect(getColorOrderKey(0)).toBe('0');
  });

  it('returns strings unchanged', () => {
    expect(getColorOrderKey('abc')).toBe('abc');
  });
});

describe('splitColorGroups', () => {
  const makeColumns = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ color_order: i + 1, color_number: `${i + 1}` }));

  it('splits columns into chunks of the given size', () => {
    const groups = splitColorGroups(makeColumns(25), 10);
    expect(groups).toHaveLength(3);
    expect(groups[0]).toHaveLength(10);
    expect(groups[1]).toHaveLength(10);
    expect(groups[2]).toHaveLength(5);
  });

  it('uses a default group size of 10', () => {
    const groups = splitColorGroups(makeColumns(11));
    expect(groups).toHaveLength(2);
    expect(groups[0]).toHaveLength(10);
    expect(groups[1]).toHaveLength(1);
  });

  it('returns one empty group for an empty input array', () => {
    const groups = splitColorGroups([]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(0);
  });
});

describe('buildColorColumnsWithGaps', () => {
  it('returns empty array for an empty map', () => {
    expect(buildColorColumnsWithGaps(new Map())).toEqual([]);
  });

  it('fills gaps between the minimum and maximum order', () => {
    const map = new Map([
      [1, 'ROJO'],
      [3, 'VERDE'],
    ]);
    const result = buildColorColumnsWithGaps(map);
    expect(result).toHaveLength(3);
    expect(result[1]).toEqual({ color_order: 2, color_number: '' });
  });

  it('starts from 1 when the minimum key is >= 1', () => {
    const map = new Map([
      [2, 'AZUL'],
      [4, 'ROJO'],
    ]);
    const result = buildColorColumnsWithGaps(map);
    expect(result[0].color_order).toBe(1);
    expect(result).toHaveLength(4);
  });

  it('starts from min when the minimum key is below 1', () => {
    const map = new Map([
      [-1, 'AZUL'],
      [2, 'ROJO'],
    ]);
    const result = buildColorColumnsWithGaps(map);
    expect(result[0].color_order).toBe(-1);
    expect(result).toHaveLength(4);
  });

  it('produces correct entries when the map has a single element', () => {
    const result = buildColorColumnsWithGaps(new Map([[3, 'NEGRO']]));
    expect(result).toHaveLength(3); // fills 1, 2, 3
    expect(result[2]).toEqual({ color_order: 3, color_number: 'NEGRO' });
  });
});

describe('truncateSheetName', () => {
  it('leaves names shorter than 31 characters unchanged', () => {
    expect(truncateSheetName('Short')).toBe('Short');
  });

  it('leaves names of exactly 31 characters unchanged', () => {
    const name = 'A'.repeat(31);
    expect(truncateSheetName(name)).toBe(name);
  });

  it('truncates names longer than 31 characters to 31', () => {
    const name = 'A'.repeat(40);
    expect(truncateSheetName(name)).toHaveLength(31);
    expect(truncateSheetName(name)).toBe('A'.repeat(31));
  });
});

describe('OrderExportService.generateCombinedBatchExcelFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls populateWorkbook once per order with customer name as sheet prefix', async () => {
    const service = new OrderExportService();
    const populateSpy = jest.spyOn(service, 'populateWorkbook').mockResolvedValue(undefined);
    jest.spyOn(service, 'writeWorkbookToFile').mockResolvedValue('/tmp/combined.xlsx');
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);

    const uri = await service.generateCombinedBatchExcelFile(
      [
        { customerName: 'Alice', items: [] },
        { customerName: 'Bob', items: [] },
      ],
      'en'
    );

    expect(uri).toBe('/tmp/combined.xlsx');
    expect(populateSpy).toHaveBeenCalledTimes(2);
    expect(populateSpy).toHaveBeenNthCalledWith(1, expect.anything(), 'Alice', [], 'en', 'Alice');
    expect(populateSpy).toHaveBeenNthCalledWith(2, expect.anything(), 'Bob', [], 'en', 'Bob');
  });

  it('omits sheet prefix for a single-order combined file', async () => {
    const service = new OrderExportService();
    const populateSpy = jest.spyOn(service, 'populateWorkbook').mockResolvedValue(undefined);
    jest.spyOn(service, 'writeWorkbookToFile').mockResolvedValue('/tmp/combined.xlsx');
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);

    await service.generateCombinedBatchExcelFile([{ customerName: 'Alice', items: [] }], 'en');

    expect(populateSpy).toHaveBeenCalledWith(expect.anything(), 'Alice', [], 'en', undefined);
  });

  it('calls writeWorkbookToFile exactly once with a batch-named file', async () => {
    const service = new OrderExportService();
    jest.spyOn(service, 'populateWorkbook').mockResolvedValue(undefined);
    const writeSpy = jest
      .spyOn(service, 'writeWorkbookToFile')
      .mockResolvedValue('/tmp/combined.xlsx');
    jest.spyOn(Date, 'now').mockReturnValue(1700000000000);

    await service.generateCombinedBatchExcelFile(
      [
        { customerName: 'Alice', items: [] },
        { customerName: 'Bob', items: [] },
      ],
      'en'
    );

    expect(writeSpy).toHaveBeenCalledTimes(1);
    expect(writeSpy).toHaveBeenCalledWith(expect.anything(), 'order_batch_1700000000000.xlsx');
  });
});
