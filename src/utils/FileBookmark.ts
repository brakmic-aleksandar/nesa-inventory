import FileBookmarkModule from '../modules/file-bookmark';
import type { ResolvedBookmark } from '../modules/file-bookmark/src/FileBookmarkModule';

export type OpenInPlacePickResult = {
  canceled: boolean;
  path?: string;
  originalPath?: string;
  name?: string;
  bookmark?: string;
};

export type { ResolvedBookmark };

export async function createBookmark(filePath: string): Promise<string | null> {
  try {
    const bookmark = await FileBookmarkModule.createBookmark(filePath);
    return bookmark;
  } catch (error) {
    console.error('Failed to create bookmark:', error);
    return null;
  }
}

export async function resolveBookmark(bookmark: string): Promise<ResolvedBookmark | null> {
  try {
    return await FileBookmarkModule.resolveBookmark(bookmark);
  } catch (error) {
    console.warn('Failed to resolve bookmark:', error);
    return null;
  }
}

export async function pickExcelFileOpenInPlace(): Promise<OpenInPlacePickResult> {
  try {
    return await FileBookmarkModule.pickExcelFileOpenInPlace();
  } catch (error) {
    console.error('Failed to pick Excel file in open-in-place mode:', error);
    return { canceled: true };
  }
}
