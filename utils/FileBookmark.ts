import FileBookmarkModule from '../modules/file-bookmark';

export type OpenInPlacePickResult = {
  canceled: boolean;
  path?: string;
  originalPath?: string;
  name?: string;
  bookmark?: string;
};

export async function createBookmark(filePath: string): Promise<string | null> {
  try {
    console.log('Bookmark creating:', filePath);
    const bookmark = await FileBookmarkModule.createBookmark(filePath);
    console.log('Bookmark created:', bookmark);
    return bookmark;
  } catch (error) {
    console.error('Failed to create bookmark:', error);
    return null;
  }
}

export async function resolveBookmark(bookmark: string): Promise<string | null> {
  try {
    console.log('Resolved file path:', bookmark);
    const filePath = await FileBookmarkModule.resolveBookmark(bookmark);
    console.log('Resolved file path:', filePath);
    return filePath;
  } catch (error) {
    console.error('Failed to resolve bookmark:', error);
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
