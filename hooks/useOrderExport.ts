import { useCallback } from 'react';
import * as MailComposer from 'expo-mail-composer';
import { Settings } from '../models/Settings';
import { orderExport, OrderItem } from '../services/OrderExportService';
import { translations } from '../localization';
import { ShareAnchor, useFileActions } from './useFileActions';
import { useLanguage } from '../contexts/LanguageContext';

export interface ExportActionResult {
  success: boolean;
  message: string;
  cancelled?: boolean;
}

const EXPORT_FILE_CLEANUP_DELAY_MS = 60_000;

export function useOrderExport() {
  const { t } = useLanguage();
  const { cleanupFile, shareExcelFile } = useFileActions();

  const scheduleFileCleanup = useCallback(
    (fileUri: string): void => {
      setTimeout(() => {
        void cleanupFile(fileUri);
      }, EXPORT_FILE_CLEANUP_DELAY_MS);
    },
    [cleanupFile]
  );

  const buildOrderSubject = useCallback((customerName: string, language: string = 'en'): string => {
    const t = translations[language] || translations.en;
    const localeMap: Record<string, string> = {
      en: 'en-US',
      sr: 'sr-RS',
      es: 'es-ES',
    };
    const locale = localeMap[language] || 'en-US';
    const dateTime = new Intl.DateTimeFormat(locale, {
      dateStyle: 'short',
      timeStyle: 'short',
    }).format(new Date());

    const prefix = t.export.orderPrefix;
    const normalizedPrefix =
      prefix.length > 0 ? `${prefix.charAt(0).toUpperCase()}${prefix.slice(1)}` : 'Order';
    return `${normalizedPrefix} ${customerName}, ${dateTime}`;
  }, []);

  const shareOrderFile = useCallback(
    async (
      customerName: string,
      items: OrderItem[],
      language: string = 'en',
      anchor?: ShareAnchor
    ): Promise<ExportActionResult> => {
      let fileUri: string | undefined;

      try {
        fileUri = await orderExport.generateExcelFile(customerName, items, language);
        await shareExcelFile(fileUri, anchor);

        return {
          success: true,
          message: t.orderSummaryScreen.excelShared,
        };
      } catch (error) {
        console.error('Error sharing order file:', error);
        const isSharingUnavailable = error instanceof Error && error.message.includes('Sharing');
        return {
          success: false,
          message: isSharingUnavailable
            ? t.orderSummaryScreen.sharingUnavailable
            : t.orderSummaryScreen.failedToSend,
        };
      } finally {
        if (fileUri) {
          scheduleFileCleanup(fileUri);
        }
      }
    },
    [
      shareExcelFile,
      scheduleFileCleanup,
      t.orderSummaryScreen.excelShared,
      t.orderSummaryScreen.failedToSend,
      t.orderSummaryScreen.sharingUnavailable,
    ]
  );

  const sendOrderByEmail = useCallback(
    async (
      customerName: string,
      items: OrderItem[],
      language: string = 'en'
    ): Promise<ExportActionResult> => {
      let fileUri: string | undefined;

      try {
        const mailAvailable = await MailComposer.isAvailableAsync();
        if (!mailAvailable) {
          return {
            success: false,
            message: t.orderSummaryScreen.mailUnavailable,
          };
        }

        fileUri = await orderExport.generateExcelFile(customerName, items, language);

        const settings = await Settings.load();
        const trimmedEmail = settings.destinationEmail.trim();
        const recipients = trimmedEmail ? [trimmedEmail] : [];
        const subject = buildOrderSubject(customerName, language);

        const result = await MailComposer.composeAsync({
          recipients,
          subject,
          attachments: [fileUri],
        });

        if (result.status === 'cancelled') {
          return {
            success: false,
            cancelled: true,
            message: t.orderSummaryScreen.emailCancelled,
          };
        }

        return {
          success: true,
          message: t.orderSummaryScreen.emailReady,
        };
      } catch (error) {
        console.error('Error sending order by email:', error);
        return {
          success: false,
          message: t.orderSummaryScreen.failedToSend,
        };
      } finally {
        if (fileUri) {
          scheduleFileCleanup(fileUri);
        }
      }
    },
    [
      buildOrderSubject,
      scheduleFileCleanup,
      t.orderSummaryScreen.emailCancelled,
      t.orderSummaryScreen.emailReady,
      t.orderSummaryScreen.failedToSend,
      t.orderSummaryScreen.mailUnavailable,
    ]
  );

  return {
    shareOrderFile,
    sendOrderByEmail,
  };
}
