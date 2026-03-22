import AsyncStorage from '@react-native-async-storage/async-storage';

import { DEFAULT_LANGUAGE, STORAGE_KEYS } from '../constants';

export class Settings {
  language: string;
  destinationEmail: string;

  constructor(language: string = DEFAULT_LANGUAGE, destinationEmail: string = '') {
    this.language = language;
    this.destinationEmail = destinationEmail;
  }

  static async load(): Promise<Settings> {
    try {
      const language = await AsyncStorage.getItem(STORAGE_KEYS.LANGUAGE);
      const destinationEmail = await AsyncStorage.getItem(STORAGE_KEYS.DESTINATION_EMAIL);

      return new Settings(language || DEFAULT_LANGUAGE, destinationEmail || '');
    } catch (error) {
      console.error('Error loading settings:', error);
      return new Settings();
    }
  }

  async save(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, this.language);
      await AsyncStorage.setItem(STORAGE_KEYS.DESTINATION_EMAIL, this.destinationEmail);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  async saveLanguage(language: string): Promise<void> {
    this.language = language;
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LANGUAGE, language);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  }

  async saveDestinationEmail(destinationEmail: string): Promise<void> {
    this.destinationEmail = destinationEmail;
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.DESTINATION_EMAIL, destinationEmail);
    } catch (error) {
      console.error('Error saving destination email:', error);
    }
  }

  static async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.LANGUAGE);
      await AsyncStorage.removeItem(STORAGE_KEYS.DESTINATION_EMAIL);
    } catch (error) {
      console.error('Error clearing settings:', error);
    }
  }

  static async saveImportedFileBookmark(
    bookmark: string,
    modDate: number,
    fileSize?: number | null
  ): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.IMPORTED_BOOKMARK, bookmark);
      await AsyncStorage.setItem(STORAGE_KEYS.IMPORTED_MODDATE, String(modDate));
      if (fileSize !== undefined) {
        if (fileSize === null) {
          await AsyncStorage.removeItem(STORAGE_KEYS.IMPORTED_FILESIZE);
        } else {
          await AsyncStorage.setItem(STORAGE_KEYS.IMPORTED_FILESIZE, String(fileSize));
        }
      }
    } catch (error) {
      console.error('Error saving imported file bookmark:', error);
    }
  }

  static async loadImportedFileBookmark(): Promise<{
    bookmark: string | null;
    modDate: number | null;
    fileSize: number | null;
  }> {
    try {
      const bookmark = await AsyncStorage.getItem(STORAGE_KEYS.IMPORTED_BOOKMARK);
      const modDate = await AsyncStorage.getItem(STORAGE_KEYS.IMPORTED_MODDATE);
      const fileSize = await AsyncStorage.getItem(STORAGE_KEYS.IMPORTED_FILESIZE);
      return {
        bookmark,
        modDate: modDate ? Number(modDate) : null,
        fileSize: fileSize ? Number(fileSize) : null,
      };
    } catch (error) {
      console.error('Error loading imported file bookmark:', error);
      return { bookmark: null, modDate: null, fileSize: null };
    }
  }

  static async clearImportedFileBookmark(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.IMPORTED_BOOKMARK);
      await AsyncStorage.removeItem(STORAGE_KEYS.IMPORTED_MODDATE);
      await AsyncStorage.removeItem(STORAGE_KEYS.IMPORTED_FILESIZE);
    } catch (error) {
      console.error('Error clearing imported file bookmark:', error);
    }
  }
}
