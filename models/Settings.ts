import AsyncStorage from '@react-native-async-storage/async-storage';

export class Settings {
  private static readonly LANGUAGE_KEY = '@settings_language';
  private static readonly DESTINATION_EMAIL_KEY = '@settings_destination_email';
  private static readonly BOOKMARK_KEY = '@settings_imported_bookmark';
  private static readonly MODDATE_KEY = '@settings_imported_moddate';
  private static readonly FILESIZE_KEY = '@settings_imported_filesize';

  language: string;
  destinationEmail: string;

  constructor(language: string = 'es', destinationEmail: string = '') {
    this.language = language;
    this.destinationEmail = destinationEmail;
  }

  // Load settings from AsyncStorage
  static async load(): Promise<Settings> {
    try {
      const language = await AsyncStorage.getItem(Settings.LANGUAGE_KEY);
      const destinationEmail = await AsyncStorage.getItem(Settings.DESTINATION_EMAIL_KEY);

      return new Settings(language || 'es', destinationEmail || '');
    } catch (error) {
      console.error('Error loading settings:', error);
      return new Settings();
    }
  }

  // Save settings to AsyncStorage
  async save(): Promise<void> {
    try {
      await AsyncStorage.setItem(Settings.LANGUAGE_KEY, this.language);
      await AsyncStorage.setItem(Settings.DESTINATION_EMAIL_KEY, this.destinationEmail);
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }

  // Save only language
  async saveLanguage(language: string): Promise<void> {
    this.language = language;
    try {
      await AsyncStorage.setItem(Settings.LANGUAGE_KEY, language);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  }

  // Save only destination email
  async saveDestinationEmail(destinationEmail: string): Promise<void> {
    this.destinationEmail = destinationEmail;
    try {
      await AsyncStorage.setItem(Settings.DESTINATION_EMAIL_KEY, destinationEmail);
    } catch (error) {
      console.error('Error saving destination email:', error);
    }
  }

  // Clear all settings
  static async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(Settings.LANGUAGE_KEY);
      await AsyncStorage.removeItem(Settings.DESTINATION_EMAIL_KEY);
    } catch (error) {
      console.error('Error clearing settings:', error);
    }
  }

  // Save bookmark and mod date
  static async saveImportedFileBookmark(
    bookmark: string,
    modDate: number,
    fileSize?: number | null
  ): Promise<void> {
    try {
      await AsyncStorage.setItem(Settings.BOOKMARK_KEY, bookmark);
      await AsyncStorage.setItem(Settings.MODDATE_KEY, String(modDate));
      if (fileSize !== undefined) {
        if (fileSize === null) {
          await AsyncStorage.removeItem(Settings.FILESIZE_KEY);
        } else {
          await AsyncStorage.setItem(Settings.FILESIZE_KEY, String(fileSize));
        }
      }
    } catch (error) {
      console.error('Error saving imported file bookmark:', error);
    }
  }

  // Load bookmark and mod date
  static async loadImportedFileBookmark(): Promise<{
    bookmark: string | null;
    modDate: number | null;
    fileSize: number | null;
  }> {
    try {
      const bookmark = await AsyncStorage.getItem(Settings.BOOKMARK_KEY);
      const modDate = await AsyncStorage.getItem(Settings.MODDATE_KEY);
      const fileSize = await AsyncStorage.getItem(Settings.FILESIZE_KEY);
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

  // Clear imported file bookmark
  static async clearImportedFileBookmark(): Promise<void> {
    try {
      await AsyncStorage.removeItem(Settings.BOOKMARK_KEY);
      await AsyncStorage.removeItem(Settings.MODDATE_KEY);
      await AsyncStorage.removeItem(Settings.FILESIZE_KEY);
    } catch (error) {
      console.error('Error clearing imported file bookmark:', error);
    }
  }
}
