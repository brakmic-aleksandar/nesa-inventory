import ExcelJS from 'exceljs';
import { Directory, File, Paths } from 'expo-file-system';
import { db } from '../database/DatabaseService';
import { translations } from '../localization';
import { SHELF_SOURCE_ID } from '../constants';

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

  /**
   * Generate Excel file from order data using ExcelJS for styling support
   */
  async generateExcelFile(
    customerName: string,
    items: OrderItem[],
    language: string = 'en'
  ): Promise<string> {
    try {
      // Create workbook with ExcelJS
      const workbook = new ExcelJS.Workbook();

      // Get all stands
      const stands = await db.getAllStands();
      const standModeByName = new Map<string, ColorHeaderMode>();
      stands.forEach((stand) => {
        standModeByName.set(
          stand.name,
          (stand as any).color_headers_mode === 'per_row' ? 'per_row' : 'per_sheet'
        );
      });

      // Create order lookup map for quick access
      const orderMap = new Map<string, number>();
      items.forEach((item) => {
        const colorOrder = this.getColorOrderKey((item as any).colorOrder);
        const key = `${item.source}|${item.name}|${item.colorNumber || ''}|${colorOrder}`;
        const currentQuantity = orderMap.get(key) || 0;
        orderMap.set(key, currentQuantity + item.quantity);
        if (item.quantity > 0) {
          console.log(`Order item: ${key} += ${item.quantity} (total: ${orderMap.get(key) || 0})`);
        }
      });

      // Create a sheet for each stand only if it has quantities
      for (const stand of stands) {
        const standItems = await db.getStandItems(stand.id);

        const standMode = standModeByName.get(stand.name) ?? 'per_sheet';

        // Build unique color columns globally for the stand (used by per_sheet mode)
        const colorColumnsMap = new Map<number, string>();
        const rowColorColumnsMap = new Map<number, Map<number, string>>();
        const standItemByRowArticleColor = new Map<string, (typeof standItems)[number]>();
        const itemCodeByRowArticle = new Map<string, string>();

        standItems.forEach((item) => {
          if (item.color_order != null && !colorColumnsMap.has(item.color_order)) {
            colorColumnsMap.set(item.color_order, item.color_number ?? '');
          }

          if (item.color_order != null) {
            if (!rowColorColumnsMap.has(item.row_index)) {
              rowColorColumnsMap.set(item.row_index, new Map<number, string>());
            }
            const rowColorMap = rowColorColumnsMap.get(item.row_index)!;
            if (!rowColorMap.has(item.color_order)) {
              rowColorMap.set(item.color_order, item.color_number ?? '');
            }

            const rowArticleColorKey = `${item.row_index}|${item.name}|${item.color_order}`;
            standItemByRowArticleColor.set(rowArticleColorKey, item);
          }

          const rowArticleKey = `${item.row_index}|${item.name}`;
          if (!itemCodeByRowArticle.has(rowArticleKey)) {
            itemCodeByRowArticle.set(rowArticleKey, item.item_code || '');
          }
        });
        // Sort color columns by color_order
        const colorColumns = this.buildColorColumnsWithGaps(colorColumnsMap);

        const colorGroups = this.splitColorGroups(colorColumns);

        // Group articles by row_index to add spacing between physical rows
        // Group articles by row_index and sort articles and rows
        const articlesByRow = new Map<number, string[]>();
        standItems.forEach((item) => {
          if (!articlesByRow.has(item.row_index)) {
            articlesByRow.set(item.row_index, []);
          }
          if (!articlesByRow.get(item.row_index)!.includes(item.name)) {
            articlesByRow.get(item.row_index)!.push(item.name);
          }
        });
        // Sort row indices
        const sortedRowIndices = Array.from(articlesByRow.keys()).sort((a, b) => a - b);
        // Sort articles alphabetically within each row
        // Do not sort articles; preserve import order

        const standHasQuantity = standItems.some((item) => {
          const orderKey = `${stand.name}|${item.name}|${item.color_number || ''}|${this.getColorOrderKey(item.color_order)}`;
          return (orderMap.get(orderKey) || 0) > 0;
        });

        if (!standHasQuantity) continue; // Skip sheet creation if no quantities

        // Add worksheet and rows as before
        const worksheet = workbook.addWorksheet(stand.name);
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
                  const standItem = standItemByRowArticleColor.get(
                    `${rowIndex}|${articleName}|${col.color_order}`
                  );
                  if (standItem) {
                    const orderKey = `${stand.name}|${standItem.name}|${standItem.color_number || ''}|${this.getColorOrderKey(standItem.color_order)}`;
                    const orderedQty = orderMap.get(orderKey) || 0;
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
                  item.color_order != null &&
                  !articleColorMap.has(item.color_order)
                ) {
                  articleColorMap.set(item.color_order, item.color_number ?? '');
                }
              });
              const articleColorColumns = this.buildColorColumnsWithGaps(articleColorMap);

              const itemCode = itemCodeByRowArticle.get(`${rowIndex}|${articleName}`) || '';
              const colorNameRow: Array<string | number> = [articleName, itemCode];
              const quantityRow: Array<string | number> = ['', ''];

              articleColorColumns.forEach((col) => {
                const standItem = standItemByRowArticleColor.get(
                  `${rowIndex}|${articleName}|${col.color_order}`
                );

                // First row: color labels next to article/code.
                colorNameRow.push(col.color_number || '');

                if (standItem) {
                  const orderKey = `${stand.name}|${standItem.name}|${standItem.color_number || ''}|${this.getColorOrderKey(standItem.color_order)}`;
                  const orderedQty = orderMap.get(orderKey) || 0;
                  // Second row: corresponding quantities directly below color labels.
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

        const maxPerRowColorColumns = sortedRowIndices.reduce((max, rowIndex) => {
          const articlesInRow = articlesByRow.get(rowIndex) ?? [];
          let rowMax = 0;

          articlesInRow.forEach((articleName) => {
            const articleColorMap = new Map<number, string>();
            standItems.forEach((item) => {
              if (
                item.row_index === rowIndex &&
                item.name === articleName &&
                item.color_order != null &&
                !articleColorMap.has(item.color_order)
              ) {
                articleColorMap.set(item.color_order, item.color_number ?? '');
              }
            });

            rowMax = Math.max(rowMax, this.buildColorColumnsWithGaps(articleColorMap).length);
          });

          return Math.max(max, rowMax);
        }, 0);
        const maxColsPerGroup =
          standMode === 'per_row'
            ? Math.max(maxPerRowColorColumns, 1)
            : Math.max(...colorGroups.map((g) => g.length), 1);
        worksheet.getColumn(1).width = 20;
        worksheet.getColumn(2).width = 12;
        for (let i = 3; i <= maxColsPerGroup + 2; i++) {
          worksheet.getColumn(i).width = 10;
        }
      }

      // Create sheet for shelf items (Polica) only if there are quantities
      const shelfItems = await db.getAllShelfItems();
      let shelfHasQuantity = false;
      shelfItems.forEach((shelfItem) => {
        const orderKey = `${SHELF_SOURCE_ID}|${shelfItem.name}||null`;
        const orderedQty = orderMap.get(orderKey) || 0;
        if (orderedQty > 0) shelfHasQuantity = true;
      });
      if (shelfHasQuantity) {
        const t = translations[language] || translations.en;
        const shelfWorksheet = workbook.addWorksheet(t.export.shelfSheetName);
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
        shelfWorksheet.getColumn(1).width = 30;
        shelfWorksheet.getColumn(2).width = 10;
      }

      // Save to file system
      const t = translations[language] || translations.en;
      const fileName = `${t.export.orderPrefix}_${customerName}_${Date.now()}.xlsx`;
      const exportRoot = Paths.cache ?? Paths.document;
      const exportDir = new Directory(exportRoot, 'exports');
      exportDir.create({ intermediates: true, idempotent: true });
      const outputFile = new File(exportDir, fileName);

      // Write workbook to buffer then to base64
      const buffer = await workbook.xlsx.writeBuffer();

      // Convert ArrayBuffer to base64 without using Buffer (React Native compatible)
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
    } catch (error) {
      console.error('Error generating Excel file:', error);
      throw error;
    }
  }
}

export const orderExport = new OrderExportService();
