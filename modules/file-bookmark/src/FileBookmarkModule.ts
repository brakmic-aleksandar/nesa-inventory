import { NativeModule, requireNativeModule } from 'expo';

import { PickExcelFileResult } from './FileBookmarkModule.types';

export interface ResolvedBookmark {
  path: string;
  exists: boolean;
  modificationTime: number | null;
  size: number | null;
  isStale: boolean;
}

declare class FileBookmarkModule extends NativeModule {
  createBookmark(filePath: string): Promise<string>;
  resolveBookmark(base64: string): Promise<ResolvedBookmark>;
  pickExcelFileOpenInPlace(): Promise<PickExcelFileResult>;
}

export default requireNativeModule<FileBookmarkModule>('FileBookmarkModule');
