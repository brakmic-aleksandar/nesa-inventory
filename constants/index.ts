/**
 * Application-wide constants
 */

// Special identifier for the shelf/polica source
export const SHELF_SOURCE_ID = 'Polica';

// AsyncStorage keys
export const STORAGE_KEYS = {
  THEME: '@app_color_scheme',
  LANGUAGE: '@settings_language',
  DESTINATION_EMAIL: '@settings_destination_email',
  IMPORTED_BOOKMARK: '@settings_imported_bookmark',
  IMPORTED_MODDATE: '@settings_imported_moddate',
  IMPORTED_FILESIZE: '@settings_imported_filesize',
} as const;

// Default language
export const DEFAULT_LANGUAGE = 'es';

// Timing constants (ms)
export const TIMING = {
  TOAST_DURATION: 3000,
  QUANTITY_SYNC_DEBOUNCE: 120,
  LONG_PRESS_DELAY: 500,
  RAPID_INCREMENT_INTERVAL: 110,
  INPUT_FOCUS_DELAY: 50,
  IMAGE_TRANSITION: 120,
  EXPORT_FILE_CLEANUP_DELAY: 60_000,
} as const;

// Layout constants
export const LAYOUT = {
  STAND_CARD_WIDTH: 180,
  STAND_ROW_HEIGHT: 270,
} as const;
