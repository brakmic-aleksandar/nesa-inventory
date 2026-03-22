import { NativeModule, requireNativeModule } from 'expo';

import { NativeImageExtractionResult, NativeRowChunkResult } from './ExcelReaderModule.types';

declare class ExcelReaderModule extends NativeModule {
  extractImages(filePath: string, sheetName: string | null): Promise<NativeImageExtractionResult>;

  readSheetRowsChunk(
    filePath: string,
    sheetName: string,
    startRow: number,
    limit: number
  ): Promise<NativeRowChunkResult>;

  listSheetNames(filePath: string): Promise<string[]>;
}

export default requireNativeModule<ExcelReaderModule>('ExcelReaderModule');
