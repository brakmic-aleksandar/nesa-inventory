import { useCallback } from 'react';
import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useLanguage } from '../contexts/LanguageContext';

export interface ShareAnchor {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function useFileActions() {
  const { t } = useLanguage();

  const cleanupFile = useCallback(async (fileUri: string): Promise<void> => {
    try {
      const file = new File(fileUri);
      if (file.exists) {
        file.delete();
      }
    } catch (deleteError) {
      console.warn('Failed to delete temporary file:', deleteError);
    }
  }, []);

  const shareFile = useCallback(async (fileUri: string): Promise<void> => {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      throw new Error('Sharing is not available on this device');
    }

    await Sharing.shareAsync(fileUri);
  }, []);

  const shareExcelFile = useCallback(
    async (fileUri: string, anchor?: ShareAnchor): Promise<void> => {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Sharing is not available on this device');
      }

      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        dialogTitle: t.export.shareOrderExcelDialogTitle,
        UTI: 'com.microsoft.excel.xlsx',
        anchor,
      });
    },
    [t.export.shareOrderExcelDialogTitle]
  );

  return {
    cleanupFile,
    shareFile,
    shareExcelFile,
  };
}
