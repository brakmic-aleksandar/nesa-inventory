import { useCallback, useState } from 'react';

import { errorCodes, isErrorWithCode, pick, types } from '@react-native-documents/picker';

import { useLanguage } from '../contexts/LanguageContext';
import { checkImportedFile, excelImport, getImportedFileFromBookmark } from '../services/ExcelImportService';
import { pickExcelFileOpenInPlace } from '../utils/FileBookmark';
import { useFileActions } from './useFileActions';

export interface ImportProgressState {
  visible: boolean;
  message: string;
}

export type ImportRunResult =
  | { status: 'cancelled' }
  | { status: 'success'; message: string }
  | { status: 'error'; message: string };

type PickedImportFile = {
  uri: string;
  name: string;
  bookmark?: string;
  sourcePath?: string;
};

export function useImportData() {
  const { t } = useLanguage();
  const { shareFile } = useFileActions();
  const [importProgress, setImportProgress] = useState<ImportProgressState>({
    visible: false,
    message: '',
  });

  const checkImportedFileChange = useCallback(async (): Promise<boolean> => {
    return checkImportedFile();
  }, []);

  const formatCount = useCallback((template: string, count: number): string => {
    return template.replace('{count}', String(count));
  }, []);

  const runImportWithFile = useCallback(
    async (file: PickedImportFile): Promise<ImportRunResult> => {
      setImportProgress({ visible: true, message: t.settings.preparingImport });

      const result = await excelImport.importFile(
        file,
        (progress) => {
          setImportProgress({ visible: true, message: progress });
        },
        {
          includeImages: true,
          progressMessages: {
            readingRowsFromSheet: t.settings.readingRowsFromSheet,
            resolvingWorkbookSheets: t.settings.resolvingWorkbookSheets,
            extractingStandImages: t.settings.extractingStandImages,
            extractingShelfImages: t.settings.extractingShelfImages,
            skippingImageExtraction: t.settings.skippingImageExtraction,
            startingDatabaseTransaction: t.settings.startingDatabaseTransaction,
            clearingExistingData: t.settings.clearingExistingData,
            importingStandItems: t.settings.importingStandItems,
            importingShelfItems: t.settings.importingShelfItems,
            importingCustomers: t.settings.importingCustomers,
            finalizingImport: t.settings.finalizingImport,
            importingStandItemRow: t.settings.importingStandItemRow,
            importingShelfItemRow: t.settings.importingShelfItemRow,
            importingCustomerRow: t.settings.importingCustomerRow,
          },
        }
      );

      if (!result.success) {
        if (result.reason === 'invalid_file_type') {
          return { status: 'error', message: t.settings.invalidExcelFile };
        }

        return {
          status: 'error',
          message: result.error || t.settings.failedToImport,
        };
      }

      const stats = result.stats;
      const message = [
        stats && stats.standsCreated > 0
          ? formatCount(t.settings.createdStandsCount, stats.standsCreated)
          : null,
        stats && stats.standItems > 0
          ? formatCount(t.settings.importedStandItemsCount, stats.standItems)
          : null,
        stats && stats.shelfItems > 0
          ? formatCount(t.settings.importedShelfItemsCount, stats.shelfItems)
          : null,
        stats && stats.customers > 0
          ? formatCount(t.settings.importedCustomersCount, stats.customers)
          : null,
      ]
        .filter(Boolean)
        .join(', ');

      return {
        status: 'success',
        message: message || t.settings.noItemsImported,
      };
    },
    [
      t.settings.preparingImport,
      t.settings.readingRowsFromSheet,
      t.settings.resolvingWorkbookSheets,
      t.settings.extractingStandImages,
      t.settings.extractingShelfImages,
      t.settings.skippingImageExtraction,
      t.settings.startingDatabaseTransaction,
      t.settings.clearingExistingData,
      t.settings.importingStandItems,
      t.settings.importingShelfItems,
      t.settings.importingCustomers,
      t.settings.finalizingImport,
      t.settings.importingStandItemRow,
      t.settings.importingShelfItemRow,
      t.settings.importingCustomerRow,
      t.settings.invalidExcelFile,
      t.settings.failedToImport,
      t.settings.createdStandsCount,
      t.settings.importedStandItemsCount,
      t.settings.importedShelfItemsCount,
      t.settings.importedCustomersCount,
      t.settings.noItemsImported,
      formatCount,
    ]
  );

  const runImportFromBookmark = useCallback(async (): Promise<ImportRunResult> => {
    try {
      const bookmarkedFile = await getImportedFileFromBookmark();
      if (!bookmarkedFile) {
        return { status: 'error', message: t.settings.failedToImport };
      }

      return await runImportWithFile(bookmarkedFile);
    } catch (error) {
      return {
        status: 'error',
        message:
          error instanceof Error && error.message ? error.message : t.settings.failedToImport,
      };
    } finally {
      setImportProgress({ visible: false, message: '' });
    }
  }, [runImportWithFile, t.settings.failedToImport]);

  const runImport = useCallback(async (): Promise<ImportRunResult> => {
    try {
      /*
      const nativePick = await pickExcelFileOpenInPlace();
      if (nativePick.canceled) {
        return { status: 'cancelled' };
      }

      if (!nativePick.path || !nativePick.name) {
        return { status: 'error', message: t.settings.failedToImport };
      }

      const fileFromCustomPicker: PickedImportFile = {
        uri: nativePick.path,
        name: nativePick.name,
        bookmark: nativePick.bookmark,
        sourcePath: nativePick.originalPath ?? nativePick.path,
      };
      */

      const [picked] = await pick({
        mode: 'open',
        type: [types.xls, types.xlsx],
      });

      const file: PickedImportFile = {
        uri: picked.uri,
        name: picked.name || 'import.xlsx',
        sourcePath: picked.uri,
      };

      return await runImportWithFile(file);
    } catch (error) {
      if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED) {
        return { status: 'cancelled' };
      }

      return {
        status: 'error',
        message:
          error instanceof Error && error.message ? error.message : t.settings.failedToImport,
      };
    } finally {
      setImportProgress({ visible: false, message: '' });
    }
  }, [t.settings.failedToImport, runImportWithFile]);

  return {
    importProgress,
    runImport,
    runImportFromBookmark,
    checkImportedFileChange,
    shareFile,
  };
}
