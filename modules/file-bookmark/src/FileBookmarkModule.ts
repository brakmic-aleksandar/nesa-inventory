import { NativeModule, requireNativeModule } from 'expo';

import { PickExcelFileResult } from './FileBookmarkModule.types';

declare class FileBookmarkModule extends NativeModule {
  createBookmark(filePath: string): Promise<string>;
  resolveBookmark(base64: string): Promise<string>;
  pickExcelFileOpenInPlace(): Promise<PickExcelFileResult>;
}

export default requireNativeModule<FileBookmarkModule>('FileBookmarkModule');
