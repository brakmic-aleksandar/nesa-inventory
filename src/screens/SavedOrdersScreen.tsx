import { useCallback, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SectionList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { EmptyState } from '../components/EmptyState';
import { Toast } from '../components/Toast';
import { theme } from '../constants/theme';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { db } from '../database/DatabaseService';
import { SavedOrder } from '../database/schema';
import { ShareAnchor } from '../hooks/useFileActions';
import { useSavedOrders } from '../hooks/useSavedOrders';

interface SavedOrdersScreenProps {
  onBack: () => void;
  onEditOrder: (orderId: number) => void;
  onSendOrder: (orderId: number) => void;
  onShareOrder: (orderId: number, anchor?: ShareAnchor) => void;
  onBatchSend: (orderIds: number[]) => void;
}

function getExpiryDays(expiresAt: string): number {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diff = expires.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatTime(dateStr: string, language: string): string {
  const date = new Date(dateStr);
  const localeMap: Record<string, string> = {
    en: 'en-US',
    sr: 'sr-RS',
    es: 'es-ES',
  };
  const locale = localeMap[language] || 'en-US';
  return new Intl.DateTimeFormat(locale, {
    timeStyle: 'short',
  }).format(date);
}

function getDateKey(dateStr: string): string {
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function getDayLabel(
  dateKey: string,
  t: { today: string; yesterday: string; daysAgo: string }
): string {
  const now = new Date();
  const todayKey = getDateKey(now.toISOString());

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = getDateKey(yesterday.toISOString());

  if (dateKey === todayKey) return t.today;
  if (dateKey === yesterdayKey) return t.yesterday;

  const [year, month, day] = dateKey.split('-').map(Number);
  const target = new Date(year, month - 1, day);
  const diff = Math.round((now.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));
  return t.daysAgo.replace('{days}', String(diff));
}

function isToday(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

function groupOrdersByDay(
  orders: SavedOrder[],
  t: { today: string; yesterday: string; daysAgo: string; expiresIn: string }
): { title: string; expiryLabel: string; data: SavedOrder[] }[] {
  const grouped = new Map<string, SavedOrder[]>();

  for (const order of orders) {
    const key = getDateKey(order.created_at);
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(order);
  }

  return Array.from(grouped.entries()).map(([dateKey, data]) => {
    const expiryDays = getExpiryDays(data[0].expires_at);
    return {
      title: getDayLabel(dateKey, t),
      expiryLabel: t.expiresIn.replace('{days}', String(expiryDays)),
      data,
    };
  });
}

export default function SavedOrdersScreen({
  onBack,
  onEditOrder,
  onSendOrder,
  onShareOrder,
  onBatchSend,
}: SavedOrdersScreenProps) {
  const { t, language } = useLanguage();
  const { colors, isDark } = useTheme();
  const { orders, loading, refresh, deleteOrder } = useSavedOrders();
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [itemCounts, setItemCounts] = useState<Record<number, number>>({});
  const shareButtonRefs = useRef<Record<number, View | null>>({});

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  useFocusEffect(
    useCallback(() => {
      const loadCounts = async () => {
        const counts: Record<number, number> = {};
        for (const order of orders) {
          const items = await db.getSavedOrderItems(order.id);
          counts[order.id] = items.reduce((sum, item) => sum + item.quantity, 0);
        }
        setItemCounts(counts);
      };
      if (orders.length > 0) {
        loadCounts();
      }
    }, [orders])
  );

  const handleDelete = (order: SavedOrder) => {
    Alert.alert(t.savedOrders.deleteConfirmTitle, t.savedOrders.deleteConfirmMessage, [
      { text: t.savedOrders.cancel, style: 'cancel' },
      {
        text: t.savedOrders.delete,
        style: 'destructive',
        onPress: async () => {
          await deleteOrder(order.id);
          Toast.success(t.savedOrders.orderDeleted);
        },
      },
    ]);
  };

  const toggleSelect = (orderId: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const todayOrders = useMemo(
    () => orders.filter((o) => isToday(o.created_at)),
    [orders]
  );

  const handleSelectAllToday = () => {
    setSelectMode(true);
    setSelectedIds(new Set(todayOrders.map((o) => o.id)));
  };

  const handleBatchSend = () => {
    if (selectedIds.size === 0) return;
    onBatchSend(Array.from(selectedIds));
  };

  const handleBatchDelete = () => {
    if (selectedIds.size === 0) return;
    Alert.alert(
      t.savedOrders.deleteSelectedConfirmTitle,
      t.savedOrders.deleteSelectedConfirmMessage.replace('{count}', String(selectedIds.size)),
      [
        { text: t.savedOrders.cancel, style: 'cancel' },
        {
          text: t.savedOrders.deleteSelected,
          style: 'destructive',
          onPress: async () => {
            for (const id of selectedIds) {
              await deleteOrder(id);
            }
            exitSelectMode();
            await refresh();
            Toast.success(t.savedOrders.orderDeleted);
          },
        },
      ]
    );
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const sections = useMemo(
    () => groupOrdersByDay(orders, t.savedOrders),
    [orders, t.savedOrders]
  );

  const renderOrderCard = ({ item: order }: { item: SavedOrder }) => {
    const count = itemCounts[order.id] ?? 0;
    const isSelected = selectedIds.has(order.id);
    const isSent = !!order.sent_at;

    return (
      <TouchableOpacity
        style={[
          styles.orderCard,
          {
            backgroundColor: colors.surface,
            borderColor: isSelected ? colors.primary : isSent ? colors.success : colors.border,
            borderWidth: isSelected ? 2 : 1,
          },
        ]}
        activeOpacity={0.7}
        onPress={() => selectMode ? toggleSelect(order.id) : onEditOrder(order.id)}
      >
        {selectMode ? (
          <View style={styles.orderCardMain}>
            <Ionicons
              name={isSelected ? 'checkbox' : 'square-outline'}
              size={theme.iconSize.large}
              color={isSelected ? colors.primary : colors.textTertiary}
              style={styles.checkbox}
            />
            <View style={styles.orderInfo}>
              <View style={styles.orderTopRow}>
                <View style={styles.customerNameRow}>
                  <Text style={[styles.customerName, { color: colors.text }]}>
                    {order.customer_name}
                  </Text>
                  {isSent && (
                    <Ionicons name="checkmark-circle" size={theme.iconSize.small} color={colors.success} />
                  )}
                  <View style={[styles.itemCountBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.itemCountText}>
                      {t.savedOrders.itemCount.replace('{count}', String(count))}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.orderDate, { color: colors.textSecondary }]}>
                  {formatTime(order.created_at, language)}
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.orderInfo}>
              <View style={styles.orderTopRow}>
                <View style={styles.customerNameRow}>
                  <Text style={[styles.customerName, { color: colors.text }]}>
                    {order.customer_name}
                  </Text>
                  {isSent && (
                    <Ionicons name="checkmark-circle" size={theme.iconSize.small} color={colors.success} />
                  )}
                  <View style={[styles.itemCountBadge, { backgroundColor: colors.primary }]}>
                    <Text style={styles.itemCountText}>
                      {t.savedOrders.itemCount.replace('{count}', String(count))}
                    </Text>
                  </View>
                </View>
                <Text style={[styles.orderDate, { color: colors.textSecondary }]}>
                  {formatTime(order.created_at, language)}
                </Text>
              </View>
            </View>
            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.surfaceSecondary }]}
                onPress={() => onSendOrder(order.id)}
              >
                <Ionicons name="paper-plane-outline" size={theme.iconSize.small} color={colors.success} />
              </TouchableOpacity>
              <TouchableOpacity
                ref={(ref) => { shareButtonRefs.current[order.id] = ref; }}
                style={[styles.actionButton, { backgroundColor: colors.surfaceSecondary }]}
                onPress={() => {
                  const ref = shareButtonRefs.current[order.id];
                  if (ref) {
                    ref.measureInWindow((x, y, width, height) => {
                      onShareOrder(order.id, { x, y, width, height });
                    });
                  } else {
                    onShareOrder(order.id);
                  }
                }}
              >
                <Ionicons name="share-outline" size={theme.iconSize.small} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.surfaceSecondary }]}
                onPress={() => handleDelete(order)}
              >
                <Ionicons name="trash-outline" size={theme.iconSize.small} color={colors.error} />
              </TouchableOpacity>
            </View>
          </>
        )}
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: { title: string; expiryLabel: string } }) => (
    <View style={[styles.sectionHeader, { backgroundColor: colors.background }]}>
      <Text style={[styles.sectionHeaderText, { color: colors.textSecondary }]}>
        {section.title}
      </Text>
      <Text style={[styles.sectionHeaderExpiry, { color: colors.textTertiary }]}>
        ({section.expiryLabel})
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Ionicons name="arrow-back" size={theme.iconSize.large} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t.savedOrders.title}</Text>
        {orders.length > 0 ? (
          <TouchableOpacity
            style={styles.selectButton}
            onPress={selectMode ? exitSelectMode : () => setSelectMode(true)}
          >
            <Text style={[styles.selectButtonText, { color: colors.primary }]}>
              {selectMode ? t.savedOrders.done : t.savedOrders.selectMode}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      {todayOrders.length > 0 && (
        <View style={[styles.selectBar, { backgroundColor: colors.surfaceSecondary }]}>
          <TouchableOpacity
            style={[styles.selectAllButton, { borderColor: colors.primary }]}
            onPress={handleSelectAllToday}
          >
            <Ionicons name="today-outline" size={theme.iconSize.small} color={colors.primary} />
            <Text style={[styles.selectAllText, { color: colors.primary }]}>
              {t.savedOrders.selectAllToday}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : orders.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title={t.savedOrders.noOrders}
          message={t.savedOrders.noOrdersMessage}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderOrderCard}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator
          stickySectionHeadersEnabled={false}
        />
      )}

      {selectMode && selectedIds.size > 0 && (
        <View
          style={[
            styles.batchFooter,
            { backgroundColor: colors.surface, borderTopColor: colors.border },
          ]}
        >
          <View style={styles.batchButtons}>
            <TouchableOpacity
              style={[styles.batchDeleteButton, { backgroundColor: colors.error }]}
              onPress={handleBatchDelete}
            >
              <Ionicons name="trash" size={theme.iconSize.medium} color={colors.textOnColor} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.batchSendButton, { backgroundColor: colors.success }]}
              onPress={handleBatchSend}
            >
              <Ionicons name="send" size={theme.iconSize.medium} color={colors.textOnColor} />
              <Text style={[styles.batchSendText, { color: colors.textOnColor }]}>
                {t.savedOrders.sendSelected} ({selectedIds.size})
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  headerTitle: {
    ...theme.typography.h4,
    flex: 1,
    textAlign: 'center',
  },
  selectButton: {
    padding: theme.spacing.sm,
  },
  selectButtonText: {
    ...theme.typography.bodyMedium,
  },
  placeholder: {
    width: 60,
  },
  selectBar: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.round,
    borderWidth: 1,
    gap: theme.spacing.xs,
  },
  selectAllText: {
    ...theme.typography.caption,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    marginTop: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  sectionHeaderText: {
    ...theme.typography.bodyBold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionHeaderExpiry: {
    ...theme.typography.caption,
  },
  orderCard: {
    borderRadius: theme.radius.medium,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    ...theme.elevation.low,
  },
  orderCardMain: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    marginRight: theme.spacing.md,
  },
  orderInfo: {
    flex: 1,
    marginBottom: theme.spacing.sm,
  },
  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  customerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    flex: 1,
  },
  customerName: {
    ...theme.typography.bodyBold,
  },
  orderDate: {
    ...theme.typography.caption,
  },
  itemCountBadge: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 2,
    borderRadius: theme.radius.round,
  },
  itemCountText: {
    color: '#ffffff',
    ...theme.typography.tiny,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  batchFooter: {
    padding: theme.spacing.md,
    borderTopWidth: 1,
  },
  batchButtons: {
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  batchDeleteButton: {
    width: 50,
    height: 50,
    borderRadius: theme.radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  batchSendButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: theme.radius.medium,
    gap: theme.spacing.sm,
    ...theme.elevation.medium,
  },
  batchSendText: {
    ...theme.typography.h4,
  },
});
