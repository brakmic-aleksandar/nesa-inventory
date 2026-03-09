import { useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  findNodeHandle,
  UIManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { EmptyState } from '../components/EmptyState';
import { Toast } from '../components/Toast';
import { SHELF_SOURCE_ID } from '../constants';
import { theme } from '../constants/theme';
import { useLanguage } from '../contexts/LanguageContext';
import { useOrder } from '../contexts/OrderContext';
import { useTheme } from '../contexts/ThemeContext';
import { useOrderExport } from '../hooks/useOrderExport';
import { groupOrderItems } from '../utils/orderGrouping';

interface OrderSummaryScreenProps {
  inputText: string;
  onBackPress: () => void;
  onOrderSent: () => void;
}

export default function OrderSummaryScreen({
  inputText,
  onBackPress,
  onOrderSent,
}: OrderSummaryScreenProps) {
  const { t, language } = useLanguage();
  const { colors, isDark } = useTheme();
  const { getAllItems, clearAll } = useOrder();
  const { sendOrderByEmail, shareOrderFile } = useOrderExport();
  const [isSending, setIsSending] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const shareButtonRef = useRef<View>(null);

  const orderItems = getAllItems();
  const totalItems = orderItems.reduce((sum, item) => sum + item.quantity, 0);

  const validateOrder = (): boolean => {
    if (!inputText.trim()) {
      Toast.error(t.orderSummaryScreen.customerRequired);
      return false;
    }

    if (orderItems.length === 0) {
      Toast.error(t.orderSummaryScreen.noItemsInOrder);
      return false;
    }

    return true;
  };

  const getShareAnchor = async (): Promise<
    | {
        x: number;
        y: number;
        width: number;
        height: number;
      }
    | undefined
  > => {
    const nodeHandle = findNodeHandle(shareButtonRef.current);
    if (!nodeHandle) {
      return undefined;
    }

    return new Promise((resolve) => {
      UIManager.measureInWindow(nodeHandle, (x, y, width, height) => {
        if (!width || !height) {
          resolve(undefined);
          return;
        }
        resolve({ x, y, width, height });
      });
    });
  };

  const handleConfirmOrder = async () => {
    if (!validateOrder()) {
      return;
    }

    let isMounted = true;
    setIsSending(true);

    try {
      const result = await sendOrderByEmail(inputText, orderItems, language);

      if (!isMounted) return;
      setIsSending(false);

      if (result.success) {
        Toast.success(t.orderSummaryScreen.emailReady);
        clearAll();
        onOrderSent();
      } else if (result.cancelled) {
        Toast.info(t.orderSummaryScreen.emailCancelled);
      } else {
        Toast.error(result.message);
      }
    } catch (error) {
      console.error('Order confirmation error:', error);
      if (!isMounted) return;
      setIsSending(false);
      Toast.error(t.orderSummaryScreen.failedToSend);
    }
  };

  const handleShareOrder = async () => {
    if (!validateOrder()) {
      return;
    }

    let isMounted = true;
    setIsSharing(true);

    try {
      const anchor = await getShareAnchor();
      const result = await shareOrderFile(inputText, orderItems, language, anchor);

      if (!isMounted) return;
      setIsSharing(false);

      if (result.success) {
        Toast.success(t.orderSummaryScreen.excelShared);
      } else {
        Toast.error(result.message);
      }
    } catch (error) {
      console.error('Order sharing error:', error);
      if (!isMounted) return;
      setIsSharing(false);
      Toast.error(t.orderSummaryScreen.failedToSend);
    }
  };

  const { itemsBySource, articleNameCounts } = groupOrderItems(
    orderItems,
    t.orderSummaryScreen.notAvailable
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header */}
      <View
        style={[
          styles.header,
          { backgroundColor: colors.surface, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity style={styles.backButton} onPress={onBackPress}>
          <Ionicons name="arrow-back" size={theme.iconSize.large} color={colors.primary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t.orderSummaryScreen.title}
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Order Info */}
      {inputText && (
        <View
          style={[
            styles.orderInfoContainer,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.orderLabel, { color: colors.textSecondary }]}>
            {t.selectionScreen.orderFor}
          </Text>
          <Text style={[styles.orderValue, { color: colors.text }]}>{inputText}</Text>
        </View>
      )}

      {/* Items Summary */}
      <View style={styles.summaryHeader}>
        <Text style={[styles.summaryTitle, { color: colors.text }]}>
          {t.orderSummaryScreen.orderDetails}
        </Text>
        <Text style={[styles.totalBadge, { backgroundColor: colors.primary, color: colors.textOnColor }]}>
          {totalItems} {t.orderSummaryScreen.items}
        </Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {orderItems.length === 0 ? (
          <EmptyState
            icon="cart-outline"
            title={t.orderSummaryScreen.noItemsSelected}
            message={t.orderSummaryScreen.goBackAndAdd}
          />
        ) : (
          Object.entries(itemsBySource).map(([source, articles]) => (
            <View key={source} style={[styles.sourceSection, { backgroundColor: colors.surface }]}>
              <View
                style={[styles.sourceTitleContainer, { borderBottomColor: colors.borderLight }]}
              >
                <Ionicons name="location" size={theme.iconSize.small} color={colors.primary} />
                <Text style={[styles.sourceTitle, { color: colors.primary }]}>
                  {source === SHELF_SOURCE_ID ? t.selectionScreen.polica : source}
                </Text>
              </View>
              {Object.entries(articles).map(([articleKey, article]) => {
                const shouldShowCode = article.itemCode && articleNameCounts[article.name].size > 1;
                const isShelfSource = source === SHELF_SOURCE_ID;
                const totalQuantity = article.colors.reduce(
                  (sum, color) => sum + color.quantity,
                  0
                );

                return (
                  <View key={articleKey} style={styles.articleGroup}>
                    <View style={styles.articleRow}>
                      <Text style={[styles.articleName, { color: colors.text }]}>
                        {article.name}
                        {shouldShowCode && (
                          <Text style={[styles.articleCode, { color: colors.textSecondary }]}>
                            {' '}
                            ({article.itemCode})
                          </Text>
                        )}
                      </Text>
                      {isShelfSource && (
                        <Text style={[styles.colorQuantity, { color: colors.primary }]}>
                          x{totalQuantity}
                        </Text>
                      )}
                    </View>
                    {!isShelfSource &&
                      article.colors.map((colorItem, colorIndex) => (
                        <View key={colorIndex} style={styles.colorRow}>
                          <Text style={[styles.colorName, { color: colors.textSecondary }]}>
                            {colorItem.color}
                          </Text>
                          <Text style={[styles.colorQuantity, { color: colors.primary }]}>
                            x{colorItem.quantity}
                          </Text>
                        </View>
                      ))}
                  </View>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      {/* Footer Buttons */}
      {orderItems.length > 0 && (
        <View
          style={[
            styles.footer,
            { backgroundColor: colors.surface, borderTopColor: colors.border },
          ]}
        >
          <View ref={shareButtonRef} collapsable={false} style={styles.shareButtonWrapper}>
            <TouchableOpacity
              style={[
                styles.shareButton,
                { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                isSharing && styles.shareButtonDisabled,
              ]}
              onPress={handleShareOrder}
              disabled={isSharing || isSending}
            >
              {isSharing ? (
                <ActivityIndicator size="small" color={colors.textSecondary} />
              ) : (
                <>
                  <Ionicons
                    name="share-social-outline"
                    size={theme.iconSize.medium}
                    color={colors.textSecondary}
                  />
                  <Text style={[styles.shareButtonText, { color: colors.textSecondary }]}>
                    {t.orderSummaryScreen.share}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              styles.confirmButton,
              { backgroundColor: colors.success },
              isSending && styles.confirmButtonDisabled,
            ]}
            onPress={handleConfirmOrder}
            disabled={isSending}
          >
            {isSending ? (
              <>
                <ActivityIndicator size="small" color={colors.textOnColor} />
                <Text style={[styles.confirmButtonText, { color: colors.textOnColor }]}>{t.orderSummaryScreen.generating}</Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={theme.iconSize.medium} color={colors.textOnColor} />
                <Text style={[styles.confirmButtonText, { color: colors.textOnColor }]}>{t.orderSummaryScreen.sendByEmail}</Text>
              </>
            )}
          </TouchableOpacity>
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
  },
  placeholder: {
    width: 44,
  },
  orderInfoContainer: {
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.medium,
    borderWidth: 1,
  },
  orderLabel: {
    ...theme.typography.caption,
    marginBottom: theme.spacing.xs,
  },
  orderValue: {
    ...theme.typography.h4,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  summaryTitle: {
    ...theme.typography.h3,
  },
  totalBadge: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.round,
    ...theme.typography.caption,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  sourceSection: {
    borderRadius: theme.radius.medium,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    ...theme.elevation.low,
  },
  sourceTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    borderBottomWidth: 1,
  },
  sourceTitle: {
    ...theme.typography.bodyBold,
    marginLeft: theme.spacing.sm,
  },
  articleGroup: {
    marginBottom: theme.spacing.lg,
  },
  articleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  articleName: {
    ...theme.typography.bodyBold,
    marginBottom: theme.spacing.sm,
  },
  articleCode: {
    ...theme.typography.caption,
  },
  colorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    paddingLeft: theme.spacing.lg,
  },
  colorName: {
    ...theme.typography.body,
  },
  colorQuantity: {
    ...theme.typography.bodyBold,
    minWidth: 50,
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    padding: theme.spacing.md,
    borderTopWidth: 1,
    gap: theme.spacing.sm,
  },
  shareButtonWrapper: {
    flex: 1,
  },
  shareButton: {
    width: '100%',
    height: 50,
    borderRadius: theme.radius.medium,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  shareButtonText: {
    ...theme.typography.body,
  },
  shareButtonDisabled: {
    opacity: 0.7,
  },
  confirmButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: theme.radius.medium,
    gap: theme.spacing.sm,
    ...theme.elevation.medium,
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    ...theme.typography.body,
  },
});
