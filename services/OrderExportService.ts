import ExcelJS from 'exceljs';
import { Directory, File, Paths } from 'expo-file-system';

import { SHELF_SOURCE_ID } from '../constants';
import { db } from '../database/DatabaseService';
import { translations } from '../localization';

export interface OrderItem {
  name: string;
  quantity: number;
  source: string;
  colorNumber?: string | null;
  colorOrder?: number | null;
}

type ColorHeaderMode = 'per_sheet' | 'per_row';

type ColorColumn = {
  color_order: number;
  color_number: string;
};

export class OrderExportService {
  private joinColorNames(colorNames: Iterable<string>): string {
    const uniqueNames: string[] = [];
    const seen = new Set<string>();

    for (const rawName of colorNames) {
      const name = rawName.trim();
      if (!name || seen.has(name)) continue;
      seen.add(name);
      uniqueNames.push(name);
    }

    return uniqueNames.join('/');
  }

  private sumPositionQuantity(
    orderMap: Map<string, number>,
    sourceName: string,
    articleName: string,
    colorOrder: number,
    colorNames: Iterable<string>
  ): number {
    const names = Array.from(colorNames)
      .map((name) => name.trim())
      .filter((name) => name.length > 0);

    if (names.length === 0) {
      const emptyKey = `${sourceName}|${articleName}||${this.getColorOrderKey(colorOrder)}`;
      return orderMap.get(emptyKey) || 0;
    }

    return names.reduce((sum, colorName) => {
      const key = `${sourceName}|${articleName}|${colorName}|${this.getColorOrderKey(colorOrder)}`;
      return sum + (orderMap.get(key) || 0);
    }, 0);
  }

  private autoSizeWorksheetColumns(worksheet: ExcelJS.Worksheet) {
    worksheet.columns.forEach((column) => {
      if (!column.eachCell) {
        return;
      }

      let maxLength = 0;

      column.eachCell({ includeEmpty: true }, (cell) => {
        const rawValue = cell.value;
        let cellText = '';

        if (rawValue == null) {
          cellText = '';
        } else if (typeof rawValue === 'object' && 'richText' in rawValue && rawValue.richText) {
          cellText = rawValue.richText.map((part) => part.text).join('');
        } else {
          cellText = String(rawValue);
        }

        maxLength = Math.max(maxLength, cellText.length);
      });

      column.width = Math.max(10, maxLength + 2);
    });
  }

  private splitColorGroups(colorColumns: ColorColumn[], groupSize = 10): ColorColumn[][] {
    const groups: ColorColumn[][] = [];
    for (let i = 0; i < colorColumns.length; i += groupSize) {
      groups.push(colorColumns.slice(i, i + groupSize));
    }
    if (groups.length === 0) {
      groups.push([]);
    }
    return groups;
  }

  private buildColorColumnsWithGaps(colorMap: Map<number, string>): ColorColumn[] {
    if (colorMap.size === 0) return [];

    const orders = Array.from(colorMap.keys()).sort((a, b) => a - b);
    const minOrder = orders[0];
    const maxOrder = orders[orders.length - 1];
    const startOrder = minOrder < 1 ? minOrder : 1;

    const result: ColorColumn[] = [];
    for (let order = startOrder; order <= maxOrder; order += 1) {
      result.push({
        color_order: order,
        color_number: colorMap.get(order) ?? '',
      });
    }

    return result;
  }

  private addColorHeaderRow(
    worksheet: ExcelJS.Worksheet,
    colorGroup: ColorColumn[],
    groupIndex: number
  ) {
    const headerLabels = colorGroup.map((col) => `${col.color_number}`);
    const headerRow = worksheet.addRow(['', '', ...headerLabels]);
    if (groupIndex === 1) {
      headerRow.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFD3D3D3' },
        };
      });
    }
  }

  private getColorOrderKey(value: unknown): string {
    if (value === undefined) return '';
    if (value === null) return 'null';
    return String(value);
  }

  private truncateSheetName(name: string): string {
    return name.length > 31 ? name.substring(0, 31) : name;
  }

  /**
   * Populate a workbook with order sheets. Extracted for reuse in batch export.
   */
  async populateWorkbook(
    workbook: ExcelJS.Workbook,
    customerName: string,
    items: OrderItem[],
    language: string = 'en',
    sheetPrefix?: string
  ): Promise<void> {
    const stands = await db.getAllStands();
    const standModeByName = new Map<string, ColorHeaderMode>();
    stands.forEach((stand) => {
      standModeByName.set(
        stand.name,
        (stand as any).color_headers_mode === 'per_row' ? 'per_row' : 'per_sheet'
      );
    });

    const orderMap = new Map<string, number>();
    items.forEach((item) => {
      const colorOrder = this.getColorOrderKey((item as any).colorOrder);
      const key = `${item.source}|${item.name}|${item.colorNumber || ''}|${colorOrder}`;
      const currentQuantity = orderMap.get(key) || 0;
      orderMap.set(key, currentQuantity + item.quantity);
    });

    const prefix = sheetPrefix ? `${sheetPrefix} - ` : '';

    for (const stand of stands) {
      const standItems = await db.getStandItems(stand.id);
      const standMode = standModeByName.get(stand.name) ?? 'per_sheet';

      const colorColumnsByOrder = new Map<number, Set<string>>();
      const positionColors = new Map<string, Set<string>>();
      const itemCodeByRowArticle = new Map<string, string>();

      standItems.forEach((item) => {
        if (item.color_order != null) {
          if (!colorColumnsByOrder.has(item.color_order)) {
            colorColumnsByOrder.set(item.color_order, new Set<string>());
          }
          const globalColorSet = colorColumnsByOrder.get(item.color_order)!;
          if (item.color_number) {
            globalColorSet.add(item.color_number);
          }

          const positionKey = `${item.row_index}|${item.name}|${item.color_order}`;
          if (!positionColors.has(positionKey)) {
            positionColors.set(positionKey, new Set<string>());
          }
          const positionColorSet = positionColors.get(positionKey)!;
          if (item.color_number) {
            positionColorSet.add(item.color_number);
          }
        }

        const rowArticleKey = `${item.row_index}|${item.name}`;
        if (!itemCodeByRowArticle.has(rowArticleKey)) {
          itemCodeByRowArticle.set(rowArticleKey, item.item_code || '');
        }
      });

      const colorColumns = this.buildColorColumnsWithGaps(
        new Map(
          Array.from(colorColumnsByOrder.entries()).map(([order, names]) => [
            order,
            this.joinColorNames(names),
          ])
        )
      );

      const colorGroups = this.splitColorGroups(colorColumns);

      const articlesByRow = new Map<number, string[]>();
      standItems.forEach((item) => {
        if (!articlesByRow.has(item.row_index)) {
          articlesByRow.set(item.row_index, []);
        }
        if (!articlesByRow.get(item.row_index)!.includes(item.name)) {
          articlesByRow.get(item.row_index)!.push(item.name);
        }
      });
      const sortedRowIndices = Array.from(articlesByRow.keys()).sort((a, b) => a - b);

      const standHasQuantity = standItems.some((item) => {
        const orderKey = `${stand.name}|${item.name}|${item.color_number || ''}|${this.getColorOrderKey(item.color_order)}`;
        return (orderMap.get(orderKey) || 0) > 0;
      });

      if (!standHasQuantity) continue;

      const sheetName = this.truncateSheetName(`${prefix}${stand.name}`);
      const worksheet = workbook.addWorksheet(sheetName);
      worksheet.addRow([stand.name]);
      worksheet.addRow([]);

      if (standMode === 'per_sheet') {
        colorGroups.forEach((colorGroup, groupIndex) => {
          this.addColorHeaderRow(worksheet, colorGroup, groupIndex);
        });
        worksheet.addRow([]);

        sortedRowIndices.forEach((rowIndex) => {
          const articlesInRow = articlesByRow.get(rowIndex)!;
          articlesInRow.forEach((articleName) => {
            const itemCode = itemCodeByRowArticle.get(`${rowIndex}|${articleName}`) || '';

            colorGroups.forEach((colorGroup, groupIndex) => {
              const rowData: Array<string | number> = [
                groupIndex === 0 ? articleName : '',
                groupIndex === 0 ? itemCode : '',
              ];

              colorGroup.forEach((col) => {
                const positionKey = `${rowIndex}|${articleName}|${col.color_order}`;
                const positionColorSet = positionColors.get(positionKey);

                if (positionColorSet) {
                  const orderedQty = this.sumPositionQuantity(
                    orderMap,
                    stand.name,
                    articleName,
                    col.color_order,
                    positionColorSet
                  );
                  rowData.push(orderedQty > 0 ? orderedQty : '');
                } else {
                  rowData.push('');
                }
              });

              const row = worksheet.addRow(rowData);
              if (groupIndex === 1) {
                row.eachCell({ includeEmpty: true }, (cell) => {
                  cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFD3D3D3' },
                  };
                });
              }
            });
          });

          worksheet.addRow([]);
        });
      } else {
        sortedRowIndices.forEach((rowIndex) => {
          const articlesInRow = articlesByRow.get(rowIndex)!;
          articlesInRow.forEach((articleName) => {
            const articleColorMap = new Map<number, string>();
            standItems.forEach((item) => {
              if (
                item.row_index === rowIndex &&
                item.name === articleName &&
                item.color_order != null
              ) {
                const existing = articleColorMap.get(item.color_order) ?? '';
                const combined = this.joinColorNames([existing, item.color_number ?? '']);
                articleColorMap.set(item.color_order, combined);
              }
            });
            const articleColorColumns = this.buildColorColumnsWithGaps(articleColorMap);

            const itemCode = itemCodeByRowArticle.get(`${rowIndex}|${articleName}`) || '';
            const colorNameRow: Array<string | number> = [articleName, itemCode];
            const quantityRow: Array<string | number> = ['', ''];

            articleColorColumns.forEach((col) => {
              const positionKey = `${rowIndex}|${articleName}|${col.color_order}`;
              const positionColorSet = positionColors.get(positionKey);

              colorNameRow.push(col.color_number || '');

              if (positionColorSet) {
                const orderedQty = this.sumPositionQuantity(
                  orderMap,
                  stand.name,
                  articleName,
                  col.color_order,
                  positionColorSet
                );
                quantityRow.push(orderedQty > 0 ? orderedQty : '');
              } else {
                quantityRow.push('');
              }
            });

            worksheet.addRow(colorNameRow);
            worksheet.addRow(quantityRow);
          });

          worksheet.addRow([]);
        });
      }

      this.autoSizeWorksheetColumns(worksheet);
    }

    // Shelf items sheet
    const shelfItems = await db.getAllShelfItems();
    let shelfHasQuantity = false;
    shelfItems.forEach((shelfItem) => {
      const orderKey = `${SHELF_SOURCE_ID}|${shelfItem.name}||null`;
      const orderedQty = orderMap.get(orderKey) || 0;
      if (orderedQty > 0) shelfHasQuantity = true;
    });
    if (shelfHasQuantity) {
      const t = translations[language] || translations.en;
      const shelfSheetName = this.truncateSheetName(`${prefix}${t.export.shelfSheetName}`);
      const shelfWorksheet = workbook.addWorksheet(shelfSheetName);
      shelfWorksheet.addRow([t.export.customerLabel, customerName]);
      shelfWorksheet.addRow([t.export.dateLabel, new Date().toLocaleDateString()]);
      shelfWorksheet.addRow([t.export.timeLabel, new Date().toLocaleTimeString()]);
      shelfWorksheet.addRow([]);
      shelfWorksheet.addRow([t.export.articleLabel, t.export.quantityLabel]);
      shelfItems.forEach((shelfItem) => {
        const orderKey = `${SHELF_SOURCE_ID}|${shelfItem.name}||null`;
        const orderedQty = orderMap.get(orderKey) || 0;
        if (orderedQty > 0) {
          shelfWorksheet.addRow([shelfItem.name, orderedQty]);
        }
      });
      this.autoSizeWorksheetColumns(shelfWorksheet);
    }
  }

  /**
   * Write a workbook to a file and return the URI.
   */
  async writeWorkbookToFile(workbook: ExcelJS.Workbook, fileName: string): Promise<string> {
    const exportRoot = Paths.cache ?? Paths.document;
    const exportDir = new Directory(exportRoot, 'exports');
    exportDir.create({ intermediates: true, idempotent: true });
    const outputFile = new File(exportDir, fileName);

    const buffer = await workbook.xlsx.writeBuffer();
    const uint8Array = new Uint8Array(buffer);
    const chunkSize = 8192;
    let binaryString = '';

    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      binaryString += String.fromCharCode(...chunk);
    }

    const base64 = btoa(binaryString);
    outputFile.write(base64, { encoding: 'base64' });

    return outputFile.uri;
  }

  /**
   * Generate Excel file from order data using ExcelJS for styling support
   */
  async generateExcelFile(
    customerName: string,
    items: OrderItem[],
    language: string = 'en'
  ): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    await this.populateWorkbook(workbook, customerName, items, language);

    const t = translations[language] || translations.en;
    const fileName = `${t.export.orderPrefix}_${customerName}_${Date.now()}.xlsx`;
    return this.writeWorkbookToFile(workbook, fileName);
  }

  /**
   * Generate separate Excel files for multiple orders (one file per order).
   * Returns an array of file URIs for use as email attachments.
   */
  async generateBatchExcelFiles(
    orders: Array<{ customerName: string; items: OrderItem[] }>,
    language: string = 'en'
  ): Promise<string[]> {
    const fileUris: string[] = [];
    const t = translations[language] || translations.en;

    for (const order of orders) {
      const workbook = new ExcelJS.Workbook();
      await this.populateWorkbook(workbook, order.customerName, order.items, language);
      const fileName = `${t.export.orderPrefix}_${order.customerName}_${Date.now()}.xlsx`;
      const uri = await this.writeWorkbookToFile(workbook, fileName);
      fileUris.push(uri);
    }

    return fileUris;
  }

  /**
   * Generate a single combined Excel file for multiple orders.
   * Each order gets its own sheets prefixed with the customer name.
   * Used for sharing via native share dialog (which only supports one file).
   */
  async generateCombinedBatchExcelFile(
    orders: Array<{ customerName: string; items: OrderItem[] }>,
    language: string = 'en'
  ): Promise<string> {
    const workbook = new ExcelJS.Workbook();
    const t = translations[language] || translations.en;

    for (const order of orders) {
      const prefix = orders.length > 1 ? order.customerName : undefined;
      await this.populateWorkbook(workbook, order.customerName, order.items, language, prefix);
    }

    const fileName = `${t.export.orderPrefix}_batch_${Date.now()}.xlsx`;
    return this.writeWorkbookToFile(workbook, fileName);
  }
}

export const orderExport = new OrderExportService();
