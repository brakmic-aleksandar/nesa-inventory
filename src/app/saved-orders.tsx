import { useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useRouter } from 'expo-router';
import * as MailComposer from 'expo-mail-composer';

import { Toast } from '../components/Toast';
import { TIMING } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';
import { useOrder } from '../contexts/OrderContext';
import { useTheme } from '../contexts/ThemeContext';
import { db } from '../database/DatabaseService';
import { SavedOrderItem } from '../database/schema';
import { ShareAnchor, useFileActions } from '../hooks/useFileActions';
import { translations } from '../localization';
import { Settings } from '../models/Settings';
import { orderExport, OrderItem } from '../services/OrderExportService';
import SavedOrdersScreen from '../screens/SavedOrdersScreen';

function groupItemsBySource(items: SavedOrderItem[]): Record<
  string,
  Array<{
    id: number;
    name: string;
    quantity: number;
    image: string;
    colorNumber?: string | null;
    itemCode?: string | null;
    colorOrder?: number | null;
  }>
> {
  const result: Record<
    string,
    Array<{
      id: number;
      name: string;
      quantity: number;
      image: string;
      colorNumber?: string | null;
      itemCode?: string | null;
      colorOrder?: number | null;
    }>
  > = {};

  items.forEach((item) => {
    if (!result[item.source]) {
      result[item.source] = [];
    }
    result[item.source].push({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      image: item.image ?? '',
      colorNumber: item.color_number,
      itemCode: item.item_code,
      colorOrder: item.color_order,
    });
  });

  return result;
}

function savedItemsToOrderItems(items: SavedOrderItem[]): OrderItem[] {
  return items
    .filter((item) => item.quantity > 0)
    .map((item) => ({
      name: item.name,
      quantity: item.quantity,
      source: item.source,
      colorNumber: item.color_number,
      colorOrder: item.color_order,
    }));
}

export default function SavedOrdersRoute() {
  const router = useRouter();
  const { loadFromSavedOrder } = useOrder();
  const { language, t } = useLanguage();
  const { colors } = useTheme();
  const { cleanupFile, shareExcelFile } = useFileActions();
  const [isBatchSending, setIsBatchSending] = useState(false);

  const handleEditOrder = async (orderId: number) => {
    try {
      const data = await db.getSavedOrderWithItems(orderId);
      if (!data) return;

      const itemsBySource = groupItemsBySource(data.items);
      loadFromSavedOrder(orderId, data.order.customer_name, itemsBySource);

      router.push({
        pathname: '/selection',
      });
    } catch (error) {
      console.error('Error loading saved order for edit:', error);
      Toast.error('Failed to load order');
    }
  };

  const handleSendOrder = async (orderId: number) => {
    try {
      const data = await db.getSavedOrderWithItems(orderId);
      if (!data) return;

      const itemsBySource = groupItemsBySource(data.items);
      loadFromSavedOrder(orderId, data.order.customer_name, itemsBySource);

      router.push('/summary');
    } catch (error) {
      console.error('Error loading saved order for send:', error);
      Toast.error('Failed to load order');
    }
  };

  const handleShareOrder = async (orderId: number, anchor?: ShareAnchor) => {
    let fileUri: string | null = null;
    try {
      const data = await db.getSavedOrderWithItems(orderId);
      if (!data) return;

      const items = savedItemsToOrderItems(data.items);
      fileUri = await orderExport.generateExcelFile(data.order.customer_name, items, language);
      await shareExcelFile(fileUri, anchor);
    } catch (error) {
      console.error('Error sharing order:', error);
      Toast.error(t.orderSummaryScreen.failedToSend);
    } finally {
      if (fileUri) {
        setTimeout(() => {
          void cleanupFile(fileUri!);
        }, TIMING.EXPORT_FILE_CLEANUP_DELAY);
      }
    }
  };

  const handleBatchSend = async (orderIds: number[]) => {
    setIsBatchSending(true);
    let fileUris: string[] = [];

    try {
      const orders: Array<{ customerName: string; items: OrderItem[] }> = [];

      for (const orderId of orderIds) {
        const data = await db.getSavedOrderWithItems(orderId);
        if (!data) continue;
        orders.push({
          customerName: data.order.customer_name,
          items: savedItemsToOrderItems(data.items),
        });
      }

      if (orders.length === 0) {
        setIsBatchSending(false);
        return;
      }

      fileUris = await orderExport.generateBatchExcelFiles(orders, language);

      const mailAvailable = await MailComposer.isAvailableAsync();
      if (!mailAvailable) {
        Toast.error(t.orderSummaryScreen.mailUnavailable);
        setIsBatchSending(false);
        return;
      }

      const settings = await Settings.load();
      const trimmedEmail = settings.destinationEmail.trim();
      const recipients = trimmedEmail ? [trimmedEmail] : [];
      const localized = translations[language] || translations.en;
      const subject = `${localized.savedOrders.batchEmailSubject} - ${new Date().toLocaleDateString()}`;

      const result = await MailComposer.composeAsync({
        recipients,
        subject,
        attachments: fileUris,
      });

      setIsBatchSending(false);

      if (result.status === 'cancelled') {
        Toast.info(t.orderSummaryScreen.emailCancelled);
      } else {
        for (const orderId of orderIds) {
          await db
            .markOrderAsSent(orderId)
            .catch((err) => console.error('Failed to mark order as sent:', err));
        }
        Toast.success(t.orderSummaryScreen.emailReady);
      }
    } catch (error) {
      console.error('Batch send error:', error);
      setIsBatchSending(false);
      Toast.error(t.orderSummaryScreen.failedToSend);
    } finally {
      if (fileUris.length > 0) {
        setTimeout(() => {
          fileUris.forEach((uri) => void cleanupFile(uri));
        }, TIMING.EXPORT_FILE_CLEANUP_DELAY);
      }
    }
  };

  if (isBatchSending) {
    return (
      <View style={[styles.loadingOverlay, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SavedOrdersScreen
      onBack={() => {
        if (router.canGoBack()) {
          router.back();
          return;
        }
        router.replace('/');
      }}
      onEditOrder={handleEditOrder}
      onSendOrder={handleSendOrder}
      onShareOrder={handleShareOrder}
      onBatchSend={handleBatchSend}
    />
  );
}

const styles = StyleSheet.create({
  loadingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
