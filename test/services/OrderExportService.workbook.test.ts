import ExcelJS from 'exceljs';

import { SHELF_SOURCE_ID } from '../../src/constants';
import { db } from '../../src/database/DatabaseService';
import { OrderExportService } from '../../src/services/OrderExportService';

jest.mock('expo-file-system', () => ({
  Directory: class Directory {
    uri: string;

    constructor(rootOrUri: string | { uri: string }, name?: string) {
      const base = typeof rootOrUri === 'string' ? rootOrUri : rootOrUri.uri;
      this.uri = name ? `${base}/${name}` : base;
    }

    create() {
      return undefined;
    }
  },
  File: class File {
    uri: string;

    constructor(parentOrUri: string | { uri: string }, name?: string) {
      if (typeof parentOrUri === 'string' && name === undefined) {
        this.uri = parentOrUri;
      } else {
        const base = typeof parentOrUri === 'string' ? parentOrUri : parentOrUri.uri;
        this.uri = `${base}/${name}`;
      }
    }

    write() {
      return undefined;
    }
  },
  Paths: {
    cache: '/cache-root',
    document: '/document-root',
  },
}));

jest.mock('../../src/database/DatabaseService', () => ({
  db: {
    getAllStands: jest.fn(),
    getStandItems: jest.fn(),
    getAllShelfItems: jest.fn(),
  },
}));

const mockedDb = db as jest.Mocked<typeof db>;

const makeWorkbook = async (
  service: OrderExportService,
  customerName: string,
  items: Array<{
    name: string;
    quantity: number;
    source: string;
    colorNumber?: string | null;
    colorOrder?: number | null;
  }>,
  language = 'en',
  sheetPrefix?: string
): Promise<ExcelJS.Workbook> => {
  const workbook = new ExcelJS.Workbook();
  await service.populateWorkbook(workbook, customerName, items, language, sheetPrefix);

  // Round-trip through XLSX serialization so tests validate generated file content.
  const buffer = await workbook.xlsx.writeBuffer();
  const loadedWorkbook = new ExcelJS.Workbook();
  await loadedWorkbook.xlsx.load(buffer);

  return loadedWorkbook;
};

describe('OrderExportService workbook generation', () => {
  let service: OrderExportService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OrderExportService();
  });

  it('generates per-sheet stand worksheet with expected color headers and quantities', async () => {
    mockedDb.getAllStands.mockResolvedValue([
      {
        id: 1,
        name: 'Stand A',
        subtitle: '',
        icon: '',
        color: '',
        order_index: 0,
        color_headers_mode: 'per_sheet',
      },
    ] as any);

    mockedDb.getStandItems.mockImplementation(async (standId: number) => {
      if (standId !== 1) return [] as any;
      return [
        {
          id: 10,
          stand_id: 1,
          name: 'Jacket',
          color_number: 'Red',
          row_index: 1,
          col_index: 1,
          item_code: 'J-01',
          image_path: null,
          color_order: 1,
        },
        {
          id: 11,
          stand_id: 1,
          name: 'Jacket',
          color_number: 'Blue',
          row_index: 1,
          col_index: 2,
          item_code: 'J-01',
          image_path: null,
          color_order: 2,
        },
      ] as any;
    });

    mockedDb.getAllShelfItems.mockResolvedValue([] as any);

    const workbook = await makeWorkbook(service, 'Alice', [
      { source: 'Stand A', name: 'Jacket', colorNumber: 'Red', colorOrder: 1, quantity: 2 },
      { source: 'Stand A', name: 'Jacket', colorNumber: 'Blue', colorOrder: 2, quantity: 3 },
    ]);

    expect(workbook.worksheets).toHaveLength(1);
    const sheet = workbook.getWorksheet('Stand A');
    expect(sheet).toBeDefined();

    expect(sheet!.getRow(1).getCell(1).value).toBe('Stand A');
    expect(sheet!.getRow(3).getCell(3).value).toBe('Red');
    expect(sheet!.getRow(3).getCell(4).value).toBe('Blue');
    expect(sheet!.getRow(5).getCell(1).value).toBe('Jacket');
    expect(sheet!.getRow(5).getCell(2).value).toBe('J-01');
    expect(sheet!.getRow(5).getCell(3).value).toBe(2);
    expect(sheet!.getRow(5).getCell(4).value).toBe(3);
  });

  it('generates per-row stand worksheet with color row followed by quantity row', async () => {
    mockedDb.getAllStands.mockResolvedValue([
      {
        id: 2,
        name: 'Stand B',
        subtitle: '',
        icon: '',
        color: '',
        order_index: 0,
        color_headers_mode: 'per_row',
      },
    ] as any);

    mockedDb.getStandItems.mockImplementation(async (standId: number) => {
      if (standId !== 2) return [] as any;
      return [
        {
          id: 20,
          stand_id: 2,
          name: 'Shirt',
          color_number: 'Green',
          row_index: 1,
          col_index: 1,
          item_code: 'S-10',
          image_path: null,
          color_order: 2,
        },
      ] as any;
    });

    mockedDb.getAllShelfItems.mockResolvedValue([] as any);

    const workbook = await makeWorkbook(service, 'Bob', [
      { source: 'Stand B', name: 'Shirt', colorNumber: 'Green', colorOrder: 2, quantity: 4 },
    ]);

    expect(workbook.worksheets).toHaveLength(1);
    const sheet = workbook.getWorksheet('Stand B');
    expect(sheet).toBeDefined();

    expect(sheet!.getRow(1).getCell(1).value).toBe('Stand B');
    expect(sheet!.getRow(3).getCell(1).value).toBe('Shirt');
    expect(sheet!.getRow(3).getCell(2).value).toBe('S-10');
    expect(sheet!.getRow(3).getCell(3).value).toBe('');
    expect(sheet!.getRow(3).getCell(4).value).toBe('Green');
    expect(sheet!.getRow(4).getCell(3).value).toBe('');
    expect(sheet!.getRow(4).getCell(4).value).toBe(4);
  });

  it('generates localized shelf sheet and includes only positive shelf quantities', async () => {
    mockedDb.getAllStands.mockResolvedValue([] as any);
    mockedDb.getStandItems.mockResolvedValue([] as any);
    mockedDb.getAllShelfItems.mockResolvedValue([
      {
        id: 1,
        name: 'Box',
        image_path: null,
        order_index: 0,
      },
      {
        id: 2,
        name: 'Tape',
        image_path: null,
        order_index: 1,
      },
    ] as any);

    const workbook = await makeWorkbook(service, 'Carla', [
      { source: SHELF_SOURCE_ID, name: 'Box', quantity: 5, colorOrder: null },
      { source: SHELF_SOURCE_ID, name: 'Tape', quantity: 0, colorOrder: null },
    ]);

    expect(workbook.worksheets).toHaveLength(1);
    const shelfSheet = workbook.getWorksheet('Shelf');
    expect(shelfSheet).toBeDefined();

    expect(shelfSheet!.getRow(1).getCell(1).value).toBe('Customer:');
    expect(shelfSheet!.getRow(1).getCell(2).value).toBe('Carla');
    expect(shelfSheet!.getRow(5).getCell(1).value).toBe('Article');
    expect(shelfSheet!.getRow(5).getCell(2).value).toBe('Quantity');
    expect(shelfSheet!.getRow(6).getCell(1).value).toBe('Box');
    expect(shelfSheet!.getRow(6).getCell(2).value).toBe(5);
    expect(shelfSheet!.getRow(7).getCell(1).value).toBeNull();
  });

  it('skips creating worksheets when all ordered quantities are empty', async () => {
    mockedDb.getAllStands.mockResolvedValue([
      {
        id: 3,
        name: 'Stand C',
        subtitle: '',
        icon: '',
        color: '',
        order_index: 0,
        color_headers_mode: 'per_sheet',
      },
    ] as any);

    mockedDb.getStandItems.mockResolvedValue([
      {
        id: 30,
        stand_id: 3,
        name: 'Pants',
        color_number: 'Black',
        row_index: 1,
        col_index: 1,
        item_code: 'P-01',
        image_path: null,
        color_order: 1,
      },
    ] as any);

    mockedDb.getAllShelfItems.mockResolvedValue([
      {
        id: 3,
        name: 'Hanger',
        image_path: null,
        order_index: 0,
      },
    ] as any);

    const workbook = await makeWorkbook(service, 'Dana', []);

    expect(workbook.worksheets).toHaveLength(0);
  });

  it('applies sheet prefixes and truncates long sheet names to Excel limits', async () => {
    mockedDb.getAllStands.mockResolvedValue([
      {
        id: 4,
        name: 'Extremely Long Stand Name For Export Validation',
        subtitle: '',
        icon: '',
        color: '',
        order_index: 0,
        color_headers_mode: 'per_sheet',
      },
    ] as any);

    mockedDb.getStandItems.mockResolvedValue([
      {
        id: 40,
        stand_id: 4,
        name: 'Coat',
        color_number: 'White',
        row_index: 1,
        col_index: 1,
        item_code: 'C-1',
        image_path: null,
        color_order: 1,
      },
    ] as any);
    mockedDb.getAllShelfItems.mockResolvedValue([] as any);

    const workbook = await makeWorkbook(
      service,
      'Eva',
      [
        {
          source: 'Extremely Long Stand Name For Export Validation',
          name: 'Coat',
          quantity: 1,
          colorNumber: 'White',
          colorOrder: 1,
        },
      ],
      'en',
      'Customer Prefix That Is Long'
    );

    expect(workbook.worksheets).toHaveLength(1);
    expect(workbook.worksheets[0].name.length).toBe(31);
    expect(workbook.worksheets[0].name).toBe('Customer Prefix That Is Long - ');
  });

  it('generates per-sheet worksheet with multiple colors in same row', async () => {
    mockedDb.getAllStands.mockResolvedValue([
      {
        id: 5,
        name: 'Colors Stand',
        subtitle: '',
        icon: '',
        color: '',
        order_index: 0,
        color_headers_mode: 'per_sheet',
      },
    ] as any);

    mockedDb.getStandItems.mockImplementation(async (standId: number) => {
      if (standId !== 5) return [] as any;
      return [
        {
          id: 50,
          stand_id: 5,
          name: 'T-Shirt',
          color_number: 'Red',
          row_index: 1,
          col_index: 1,
          item_code: 'TS-01',
          image_path: null,
          color_order: 1,
        },
        {
          id: 51,
          stand_id: 5,
          name: 'T-Shirt',
          color_number: 'Blue',
          row_index: 1,
          col_index: 2,
          item_code: 'TS-01',
          image_path: null,
          color_order: 2,
        },
        {
          id: 52,
          stand_id: 5,
          name: 'T-Shirt',
          color_number: 'Green',
          row_index: 1,
          col_index: 3,
          item_code: 'TS-01',
          image_path: null,
          color_order: 3,
        },
      ] as any;
    });

    mockedDb.getAllShelfItems.mockResolvedValue([] as any);

    const workbook = await makeWorkbook(service, 'Frank', [
      { source: 'Colors Stand', name: 'T-Shirt', colorNumber: 'Red', colorOrder: 1, quantity: 5 },
      { source: 'Colors Stand', name: 'T-Shirt', colorNumber: 'Blue', colorOrder: 2, quantity: 3 },
      { source: 'Colors Stand', name: 'T-Shirt', colorNumber: 'Green', colorOrder: 3, quantity: 7 },
    ]);

    expect(workbook.worksheets).toHaveLength(1);
    const sheet = workbook.getWorksheet('Colors Stand');
    expect(sheet).toBeDefined();

    expect(sheet!.getRow(3).getCell(3).value).toBe('Red');
    expect(sheet!.getRow(3).getCell(4).value).toBe('Blue');
    expect(sheet!.getRow(3).getCell(5).value).toBe('Green');

    expect(sheet!.getRow(5).getCell(1).value).toBe('T-Shirt');
    expect(sheet!.getRow(5).getCell(2).value).toBe('TS-01');
    expect(sheet!.getRow(5).getCell(3).value).toBe(5);
    expect(sheet!.getRow(5).getCell(4).value).toBe(3);
    expect(sheet!.getRow(5).getCell(5).value).toBe(7);
  });

  it('generates per-row worksheet with multiple colors in same row', async () => {
    mockedDb.getAllStands.mockResolvedValue([
      {
        id: 6,
        name: 'Per-Row Stand',
        subtitle: '',
        icon: '',
        color: '',
        order_index: 0,
        color_headers_mode: 'per_row',
      },
    ] as any);

    mockedDb.getStandItems.mockImplementation(async (standId: number) => {
      if (standId !== 6) return [] as any;
      return [
        {
          id: 60,
          stand_id: 6,
          name: 'Sweater',
          color_number: 'Navy',
          row_index: 1,
          col_index: 1,
          item_code: 'SW-01',
          image_path: null,
          color_order: 1,
        },
        {
          id: 61,
          stand_id: 6,
          name: 'Sweater',
          color_number: 'Gray',
          row_index: 1,
          col_index: 2,
          item_code: 'SW-01',
          image_path: null,
          color_order: 2,
        },
        {
          id: 62,
          stand_id: 6,
          name: 'Sweater',
          color_number: 'White',
          row_index: 1,
          col_index: 3,
          item_code: 'SW-01',
          image_path: null,
          color_order: 3,
        },
      ] as any;
    });

    mockedDb.getAllShelfItems.mockResolvedValue([] as any);

    const workbook = await makeWorkbook(service, 'Grace', [
      { source: 'Per-Row Stand', name: 'Sweater', colorNumber: 'Navy', colorOrder: 1, quantity: 2 },
      { source: 'Per-Row Stand', name: 'Sweater', colorNumber: 'Gray', colorOrder: 2, quantity: 4 },
      {
        source: 'Per-Row Stand',
        name: 'Sweater',
        colorNumber: 'White',
        colorOrder: 3,
        quantity: 6,
      },
    ]);

    expect(workbook.worksheets).toHaveLength(1);
    const sheet = workbook.getWorksheet('Per-Row Stand');
    expect(sheet).toBeDefined();

    const colorHeaderRow = sheet!.getRow(3);
    expect(colorHeaderRow.getCell(1).value).toBe('Sweater');
    expect(colorHeaderRow.getCell(2).value).toBe('SW-01');
    expect(colorHeaderRow.getCell(3).value).toBe('Navy');
    expect(colorHeaderRow.getCell(4).value).toBe('Gray');
    expect(colorHeaderRow.getCell(5).value).toBe('White');

    const quantityRow = sheet!.getRow(4);
    expect(quantityRow.getCell(1).value).toBe('');
    expect(quantityRow.getCell(2).value).toBe('');
    expect(quantityRow.getCell(3).value).toBe(2);
    expect(quantityRow.getCell(4).value).toBe(4);
    expect(quantityRow.getCell(5).value).toBe(6);
  });

  it('aggregates quantities when same color in same row is ordered multiple times', async () => {
    mockedDb.getAllStands.mockResolvedValue([
      {
        id: 7,
        name: 'Aggregate Stand',
        subtitle: '',
        icon: '',
        color: '',
        order_index: 0,
        color_headers_mode: 'per_sheet',
      },
    ] as any);

    mockedDb.getStandItems.mockImplementation(async (standId: number) => {
      if (standId !== 7) return [] as any;
      return [
        {
          id: 70,
          stand_id: 7,
          name: 'Hat',
          color_number: 'Black',
          row_index: 1,
          col_index: 1,
          item_code: 'H-01',
          image_path: null,
          color_order: 1,
        },
      ] as any;
    });

    mockedDb.getAllShelfItems.mockResolvedValue([] as any);

    const workbook = await makeWorkbook(service, 'Henry', [
      { source: 'Aggregate Stand', name: 'Hat', colorNumber: 'Black', colorOrder: 1, quantity: 3 },
      { source: 'Aggregate Stand', name: 'Hat', colorNumber: 'Black', colorOrder: 1, quantity: 2 },
      { source: 'Aggregate Stand', name: 'Hat', colorNumber: 'Black', colorOrder: 1, quantity: 5 },
    ]);

    expect(workbook.worksheets).toHaveLength(1);
    const sheet = workbook.getWorksheet('Aggregate Stand');
    expect(sheet).toBeDefined();

    expect(sheet!.getRow(5).getCell(1).value).toBe('Hat');
    expect(sheet!.getRow(5).getCell(2).value).toBe('H-01');
    expect(sheet!.getRow(5).getCell(3).value).toBe(10);
  });

  it('handles 12 colors split across multiple groups in per-sheet mode', async () => {
    mockedDb.getAllStands.mockResolvedValue([
      {
        id: 8,
        name: 'Rainbow Stand',
        subtitle: '',
        icon: '',
        color: '',
        order_index: 0,
        color_headers_mode: 'per_sheet',
      },
    ] as any);

    const standItems = Array.from({ length: 12 }, (_, i) => ({
      id: 80 + i,
      stand_id: 8,
      name: 'Color Swatch',
      color_number: `Color${i + 1}`,
      row_index: 1,
      col_index: i + 1,
      item_code: 'CS-01',
      image_path: null,
      color_order: i + 1,
    }));

    mockedDb.getStandItems.mockResolvedValue(standItems as any);
    mockedDb.getAllShelfItems.mockResolvedValue([] as any);

    const orderItems = Array.from({ length: 12 }, (_, i) => ({
      source: 'Rainbow Stand',
      name: 'Color Swatch',
      colorNumber: `Color${i + 1}`,
      colorOrder: i + 1,
      quantity: i + 1,
    }));

    const workbook = await makeWorkbook(service, 'Iris', orderItems);

    expect(workbook.worksheets).toHaveLength(1);
    const sheet = workbook.getWorksheet('Rainbow Stand');
    expect(sheet).toBeDefined();

    const firstGroupHeaderRow = sheet!.getRow(3);
    expect(firstGroupHeaderRow.getCell(3).value).toBe('Color1');
    expect(firstGroupHeaderRow.getCell(12).value).toBe('Color10');

    const secondGroupHeaderRow = sheet!.getRow(4);
    expect(secondGroupHeaderRow.getCell(3).value).toBe('Color11');
    expect(secondGroupHeaderRow.getCell(4).value).toBe('Color12');

    const firstGroupDataRow = sheet!.getRow(6);
    expect(firstGroupDataRow.getCell(1).value).toBe('Color Swatch');
    expect(firstGroupDataRow.getCell(2).value).toBe('CS-01');
    expect(firstGroupDataRow.getCell(3).value).toBe(1);
    expect(firstGroupDataRow.getCell(12).value).toBe(10);

    const secondGroupDataRow = sheet!.getRow(7);
    expect(secondGroupDataRow.getCell(1).value).toBe('');
    expect(secondGroupDataRow.getCell(2).value).toBe('');
    expect(secondGroupDataRow.getCell(3).value).toBe(11);
    expect(secondGroupDataRow.getCell(4).value).toBe(12);
  });

  it('distinguishes items by row index with multiple items per stand', async () => {
    mockedDb.getAllStands.mockResolvedValue([
      {
        id: 9,
        name: 'Multi-Item Stand',
        subtitle: '',
        icon: '',
        color: '',
        order_index: 0,
        color_headers_mode: 'per_sheet',
      },
    ] as any);

    mockedDb.getStandItems.mockImplementation(async (standId: number) => {
      if (standId !== 9) return [] as any;
      return [
        {
          id: 90,
          stand_id: 9,
          name: 'Socks',
          color_number: 'Black',
          row_index: 1,
          col_index: 1,
          item_code: 'SO-01',
          image_path: null,
          color_order: 1,
        },
        {
          id: 91,
          stand_id: 9,
          name: 'Socks',
          color_number: 'White',
          row_index: 1,
          col_index: 2,
          item_code: 'SO-01',
          image_path: null,
          color_order: 2,
        },
        {
          id: 92,
          stand_id: 9,
          name: 'Gloves',
          color_number: 'Red',
          row_index: 2,
          col_index: 1,
          item_code: 'GL-01',
          image_path: null,
          color_order: 1,
        },
        {
          id: 93,
          stand_id: 9,
          name: 'Gloves',
          color_number: 'Blue',
          row_index: 2,
          col_index: 2,
          item_code: 'GL-01',
          image_path: null,
          color_order: 2,
        },
      ] as any;
    });

    mockedDb.getAllShelfItems.mockResolvedValue([] as any);

    const workbook = await makeWorkbook(service, 'Ivan', [
      {
        source: 'Multi-Item Stand',
        name: 'Socks',
        colorNumber: 'Black',
        colorOrder: 1,
        quantity: 10,
      },
      {
        source: 'Multi-Item Stand',
        name: 'Socks',
        colorNumber: 'White',
        colorOrder: 2,
        quantity: 15,
      },
      {
        source: 'Multi-Item Stand',
        name: 'Gloves',
        colorNumber: 'Red',
        colorOrder: 1,
        quantity: 5,
      },
      {
        source: 'Multi-Item Stand',
        name: 'Gloves',
        colorNumber: 'Blue',
        colorOrder: 2,
        quantity: 8,
      },
    ]);

    expect(workbook.worksheets).toHaveLength(1);
    const sheet = workbook.getWorksheet('Multi-Item Stand');
    expect(sheet).toBeDefined();

    const colorHeaderRow = sheet!.getRow(3);
    expect(colorHeaderRow.getCell(3).value).toBe('Black/Red');
    expect(colorHeaderRow.getCell(4).value).toBe('White/Blue');

    const socksRow = sheet!.getRow(5);
    expect(socksRow.getCell(1).value).toBe('Socks');
    expect(socksRow.getCell(2).value).toBe('SO-01');
    expect(socksRow.getCell(3).value).toBe(10);
    expect(socksRow.getCell(4).value).toBe(15);

    const glovesRow = sheet!.getRow(7);
    expect(glovesRow.getCell(1).value).toBe('Gloves');
    expect(glovesRow.getCell(2).value).toBe('GL-01');
    expect(glovesRow.getCell(3).value).toBe(5);
    expect(glovesRow.getCell(4).value).toBe(8);
  });

  it('creates separate worksheets for multiple stands with quantities', async () => {
    mockedDb.getAllStands.mockResolvedValue([
      {
        id: 10,
        name: 'Stand One',
        subtitle: '',
        icon: '',
        color: '',
        order_index: 0,
        color_headers_mode: 'per_sheet',
      },
      {
        id: 11,
        name: 'Stand Two',
        subtitle: '',
        icon: '',
        color: '',
        order_index: 1,
        color_headers_mode: 'per_sheet',
      },
    ] as any);

    mockedDb.getStandItems.mockImplementation(async (standId: number) => {
      if (standId === 10) {
        return [
          {
            id: 100,
            stand_id: 10,
            name: 'Item A',
            color_number: 'Red',
            row_index: 1,
            col_index: 1,
            item_code: 'A-1',
            image_path: null,
            color_order: 1,
          },
        ] as any;
      }

      if (standId === 11) {
        return [
          {
            id: 110,
            stand_id: 11,
            name: 'Item B',
            color_number: 'Blue',
            row_index: 1,
            col_index: 1,
            item_code: 'B-1',
            image_path: null,
            color_order: 1,
          },
        ] as any;
      }

      return [] as any;
    });

    mockedDb.getAllShelfItems.mockResolvedValue([] as any);

    const workbook = await makeWorkbook(service, 'Jana', [
      { source: 'Stand One', name: 'Item A', colorNumber: 'Red', colorOrder: 1, quantity: 4 },
      { source: 'Stand Two', name: 'Item B', colorNumber: 'Blue', colorOrder: 1, quantity: 9 },
    ]);

    expect(workbook.worksheets).toHaveLength(2);
    expect(workbook.worksheets.map((w) => w.name)).toEqual(['Stand One', 'Stand Two']);

    const standOneSheet = workbook.getWorksheet('Stand One');
    expect(standOneSheet).toBeDefined();
    expect(standOneSheet!.getRow(5).getCell(1).value).toBe('Item A');
    expect(standOneSheet!.getRow(5).getCell(3).value).toBe(4);

    const standTwoSheet = workbook.getWorksheet('Stand Two');
    expect(standTwoSheet).toBeDefined();
    expect(standTwoSheet!.getRow(5).getCell(1).value).toBe('Item B');
    expect(standTwoSheet!.getRow(5).getCell(3).value).toBe(9);
  });

  it('skips stands without quantities when multiple stands exist', async () => {
    mockedDb.getAllStands.mockResolvedValue([
      {
        id: 12,
        name: 'Included Stand',
        subtitle: '',
        icon: '',
        color: '',
        order_index: 0,
        color_headers_mode: 'per_sheet',
      },
      {
        id: 13,
        name: 'Skipped Stand',
        subtitle: '',
        icon: '',
        color: '',
        order_index: 1,
        color_headers_mode: 'per_sheet',
      },
    ] as any);

    mockedDb.getStandItems.mockImplementation(async (standId: number) => {
      if (standId === 12) {
        return [
          {
            id: 120,
            stand_id: 12,
            name: 'Included Item',
            color_number: 'Black',
            row_index: 1,
            col_index: 1,
            item_code: 'I-1',
            image_path: null,
            color_order: 1,
          },
        ] as any;
      }

      if (standId === 13) {
        return [
          {
            id: 130,
            stand_id: 13,
            name: 'Skipped Item',
            color_number: 'White',
            row_index: 1,
            col_index: 1,
            item_code: 'S-1',
            image_path: null,
            color_order: 1,
          },
        ] as any;
      }

      return [] as any;
    });

    mockedDb.getAllShelfItems.mockResolvedValue([] as any);

    const workbook = await makeWorkbook(service, 'Kosta', [
      {
        source: 'Included Stand',
        name: 'Included Item',
        colorNumber: 'Black',
        colorOrder: 1,
        quantity: 2,
      },
    ]);

    expect(workbook.worksheets).toHaveLength(1);
    expect(workbook.worksheets[0].name).toBe('Included Stand');
    expect(workbook.getWorksheet('Skipped Stand')).toBeUndefined();
  });
});
