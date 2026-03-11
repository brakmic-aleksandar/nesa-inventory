import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Animated,
  FlatList,
  ScrollView,
  Keyboard,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';

import { EmptyState } from '../components/EmptyState';
import { ItemCard } from '../components/ItemCard';
import { SkeletonRow } from '../components/SkeletonLoader';
import { LAYOUT, TIMING } from '../constants';
import { theme } from '../constants/theme';
import { useLanguage } from '../contexts/LanguageContext';
import { useOrder } from '../contexts/OrderContext';
import { useTheme } from '../contexts/ThemeContext';
import { db } from '../database/DatabaseService';

interface StandScreenProps {
  cardTitle: string;
}

function StandLoadingSkeleton() {
  return (
    <ScrollView style={styles.scrollView}>
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
      <SkeletonRow />
    </ScrollView>
  );
}

interface Item {
  id: number;
  name: string;
  quantity: number;
  image: string;
  colorNumber?: string | null;
  itemCode?: string | null;
  rowIndex?: number;
  colorOrder?: number | null;
}

const STAND_CARD_WIDTH = LAYOUT.STAND_CARD_WIDTH;
const STAND_CARD_GAP = theme.spacing.md;
const STAND_CARD_FULL_WIDTH = STAND_CARD_WIDTH + STAND_CARD_GAP;
const STAND_ROW_HEIGHT = LAYOUT.STAND_ROW_HEIGHT;
const KEYBOARD_CLEARANCE = theme.spacing.xl;

export default function StandScreen({ cardTitle }: StandScreenProps) {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const { getItems, setItems } = useOrder();
  const [rows, setRows] = useState<Item[][]>([]);
  const [loading, setLoading] = useState(true);
  const [quantityInputTarget, setQuantityInputTarget] = useState<{
    rowIndex: number;
    itemId: number;
  } | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const listRef = useRef<FlatList<Item[]> | null>(null);
  const listHeightRef = useRef(0);
  const scrollOffsetRef = useRef(0);
  const scaleAnims = useRef<Map<string, Animated.Value>>(new Map());
  const longPressTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const longPressIntervals = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const syncItemsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadRef = useRef(true);

  const standCardColors = useMemo(
    () => ({
      surface: colors.surface,
      border: colors.border,
      primary: colors.primary,
      surfaceSecondary: colors.surfaceSecondary,
      text: colors.text,
      textSecondary: colors.textSecondary,
      textOnColor: colors.textOnColor,
      placeholderIcon: colors.placeholderIcon,
    }),
    [
      colors.surface,
      colors.border,
      colors.primary,
      colors.surfaceSecondary,
      colors.text,
      colors.textSecondary,
      colors.textOnColor,
      colors.placeholderIcon,
    ]
  );

  useEffect(() => {
    scaleAnims.current.clear();
  }, [cardTitle]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!quantityInputTarget || keyboardHeight <= 0) {
      return;
    }

    const visibleBottom =
      scrollOffsetRef.current +
      Math.max(0, listHeightRef.current - keyboardHeight - KEYBOARD_CLEARANCE);
    const focusedRowBottom = (quantityInputTarget.rowIndex + 1) * STAND_ROW_HEIGHT;

    if (focusedRowBottom <= visibleBottom) {
      return;
    }

    const timer = setTimeout(() => {
      listRef.current?.scrollToIndex({
        index: quantityInputTarget.rowIndex,
        animated: true,
        viewPosition: 0.2,
      });
    }, 30);

    return () => clearTimeout(timer);
  }, [keyboardHeight, quantityInputTarget]);

  // Load items for the current stand route
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    const load = async () => {
      try {
        const stand = await db.getStandByName(cardTitle);
        if (!stand) {
          console.error('Stand not found:', cardTitle);
          if (isMounted) setLoading(false);
          return;
        }
        const dbItems = await db.getStandItems(stand.id);
        if (!dbItems || !Array.isArray(dbItems)) {
          console.error('Invalid data returned from database');
          if (isMounted) setLoading(false);
          return;
        }
        if (!isMounted) return;
        const rowMap = new Map<number, Item[]>();
        for (const dbItem of dbItems) {
          const mappedItem: Item = {
            id: dbItem.id,
            name: dbItem.name,
            quantity: 0,
            image: dbItem.image_path || 'placeholder',
            colorNumber: dbItem.color_number,
            itemCode: dbItem.item_code,
            rowIndex: dbItem.row_index,
            colorOrder: dbItem.color_order ?? null,
          };

          const existingRow = rowMap.get(dbItem.row_index);
          if (existingRow) {
            existingRow.push(mappedItem);
          } else {
            rowMap.set(dbItem.row_index, [mappedItem]);
          }
        }

        let finalRows: Item[][] = [...rowMap.entries()]
          .sort(([rowA], [rowB]) => rowA - rowB)
          .map(([, rowItems]) => rowItems);

        // Merge saved quantities from context in a single pass
        const savedItems = getItems(cardTitle);
        if (savedItems.length > 0) {
          const savedByKey = new Map<string, { quantity: number; colorOrder: number | null }>();
          for (const saved of savedItems) {
            const key = `${saved.name}::${saved.colorNumber ?? ''}::${saved.colorOrder ?? ''}`;
            savedByKey.set(key, {
              quantity: saved.quantity,
              colorOrder: saved.colorOrder ?? null,
            });
          }

          finalRows = finalRows.map((row) =>
            row.map((item) => {
              const itemKey = `${item.name}::${item.colorNumber ?? ''}::${item.colorOrder ?? ''}`;
              const saved = savedByKey.get(itemKey);
              return saved
                ? {
                    ...item,
                    quantity: saved.quantity,
                    colorOrder: saved.colorOrder ?? item.colorOrder ?? null,
                  }
                : item;
            })
          );
        }
        setRows(finalRows);
        setLoading(false);
      } catch (error) {
        console.error('Error loading stand items:', error);
        setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, [cardTitle]);

  useEffect(() => {
    // Cleanup timers on unmount to prevent memory leaks
    const timers = longPressTimers.current;
    const intervals = longPressIntervals.current;

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
      intervals.forEach((interval) => clearInterval(interval));
      intervals.clear();
    };
  }, []);

  useEffect(() => {
    // Skip the initial load — context already has this data
    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      return;
    }

    // Batch context sync so a single +/- press does not force expensive full-list flattening immediately.
    if (syncItemsTimer.current) {
      clearTimeout(syncItemsTimer.current);
    }

    syncItemsTimer.current = setTimeout(() => {
      const allItems = rows.flat().map((item) => ({
        ...item,
        colorOrder: item.colorOrder ?? null,
      }));
      setItems(cardTitle, allItems);
    }, TIMING.QUANTITY_SYNC_DEBOUNCE);

    return () => {
      if (syncItemsTimer.current) {
        clearTimeout(syncItemsTimer.current);
        syncItemsTimer.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, cardTitle, setItems]);

  const updateQuantity = useCallback((rowIndex: number, itemId: number, delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setRows((prevRows) => {
      const newRows = [...prevRows];
      const newRow = [...newRows[rowIndex]];
      const itemIndex = newRow.findIndex((item) => item.id === itemId);
      if (itemIndex !== -1) {
        const newQuantity = Math.max(0, newRow[itemIndex].quantity + delta);
        if (newQuantity === newRow[itemIndex].quantity) {
          return prevRows;
        }

        newRow[itemIndex] = {
          ...newRow[itemIndex],
          quantity: newQuantity,
        };

        // Animate quantity change
        const key = `${rowIndex}-${itemId}`;
        if (!scaleAnims.current.has(key)) {
          scaleAnims.current.set(key, new Animated.Value(1));
        }
        const anim = scaleAnims.current.get(key)!;
        Animated.sequence([
          Animated.timing(anim, { toValue: 1.3, duration: 100, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();
      }
      newRows[rowIndex] = newRow;
      return newRows;
    });
  }, []);

  const handleLongPressIn = useCallback(
    (rowIndex: number, itemId: number, delta: number) => {
      const key = `${rowIndex}-${itemId}-${delta}`;

      // Start long press after 500ms
      const timer = setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        // Start rapid increment/decrement
        const interval = setInterval(() => {
          updateQuantity(rowIndex, itemId, delta);
        }, TIMING.RAPID_INCREMENT_INTERVAL);
        longPressIntervals.current.set(key, interval);
      }, TIMING.LONG_PRESS_DELAY);

      longPressTimers.current.set(key, timer);
    },
    [updateQuantity]
  );

  const handleLongPressOut = useCallback((rowIndex: number, itemId: number, delta: number) => {
    const key = `${rowIndex}-${itemId}-${delta}`;

    // Clear timers
    const timer = longPressTimers.current.get(key);
    if (timer) {
      clearTimeout(timer);
      longPressTimers.current.delete(key);
    }

    const interval = longPressIntervals.current.get(key);
    if (interval) {
      clearInterval(interval);
      longPressIntervals.current.delete(key);
    }
  }, []);

  const setDirectQuantity = useCallback((rowIndex: number, itemId: number, quantity: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setRows((prevRows) => {
      const newRows = [...prevRows];
      const newRow = [...newRows[rowIndex]];
      const itemIndex = newRow.findIndex((item) => item.id === itemId);
      if (itemIndex !== -1) {
        newRow[itemIndex] = {
          ...newRow[itemIndex],
          quantity,
        };
      }
      newRows[rowIndex] = newRow;
      return newRows;
    });
  }, []);

  const handleOpenQuantityInput = useCallback(
    (rowIndex: number, itemId: number) => {
      setQuantityInputTarget({ rowIndex, itemId });

      if (keyboardHeight <= 0) {
        return;
      }

      const visibleBottom =
        scrollOffsetRef.current +
        Math.max(0, listHeightRef.current - keyboardHeight - KEYBOARD_CLEARANCE);
      const focusedRowBottom = (rowIndex + 1) * STAND_ROW_HEIGHT;

      if (focusedRowBottom <= visibleBottom) {
        return;
      }

      setTimeout(() => {
        listRef.current?.scrollToIndex({
          index: rowIndex,
          animated: true,
          viewPosition: 0.2,
        });
      }, TIMING.INPUT_FOCUS_DELAY);
    },
    [keyboardHeight]
  );

  const renderStandRow = useCallback(
    ({ item: row, index: rowIndex }: { item: Item[]; index: number }) => {
      const actualRowNumber = row[0]?.rowIndex !== undefined ? row[0].rowIndex + 1 : rowIndex + 1;

      return (
        <View style={styles.rowContainer}>
          <View style={styles.rowWithLabel}>
            <View style={[styles.rowLabel, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[styles.rowLabelText, { color: colors.textSecondary }]}>
                {actualRowNumber}
              </Text>
            </View>
            <FlatList
              data={row}
              horizontal
              keyExtractor={(item) => String(item.id)}
              showsHorizontalScrollIndicator={false}
              style={styles.horizontalScroll}
              contentContainerStyle={styles.horizontalScrollContent}
              removeClippedSubviews
              initialNumToRender={4}
              maxToRenderPerBatch={6}
              windowSize={3}
              getItemLayout={(_, index) => ({
                length: STAND_CARD_FULL_WIDTH,
                offset: STAND_CARD_FULL_WIDTH * index,
                index,
              })}
              renderItem={({ item }) => {
                const key = `${rowIndex}-${item.id}`;
                const scaleAnim = scaleAnims.current.get(key) || new Animated.Value(1);
                if (!scaleAnims.current.has(key)) {
                  scaleAnims.current.set(key, scaleAnim);
                }

                return (
                  <ItemCard
                    key={item.id}
                    item={item}
                    colors={standCardColors}
                    scaleAnim={scaleAnim}
                    showQuantityInput={
                      quantityInputTarget?.rowIndex === rowIndex &&
                      quantityInputTarget?.itemId === item.id
                    }
                    detailsHref={{
                      pathname: '/stand-item-details',
                      params: {
                        name: item.name,
                        image: item.image,
                        quantity: String(item.quantity),
                        colorNumber: item.colorNumber || '',
                        itemCode: item.itemCode || '',
                      },
                    }}
                    variant="stand"
                    onDecrease={() => updateQuantity(rowIndex, item.id, -1)}
                    onDecreasePressIn={() => handleLongPressIn(rowIndex, item.id, -1)}
                    onDecreasePressOut={() => handleLongPressOut(rowIndex, item.id, -1)}
                    onIncrease={() => updateQuantity(rowIndex, item.id, 1)}
                    onIncreasePressIn={() => handleLongPressIn(rowIndex, item.id, 1)}
                    onIncreasePressOut={() => handleLongPressOut(rowIndex, item.id, 1)}
                    onOpenQuantityInput={() => handleOpenQuantityInput(rowIndex, item.id)}
                    onCloseQuantityInput={() => setQuantityInputTarget(null)}
                    onSetQuantity={(quantity) => setDirectQuantity(rowIndex, item.id, quantity)}
                  />
                );
              }}
            />
          </View>
        </View>
      );
    },
    [
      standCardColors,
      quantityInputTarget,
      setDirectQuantity,
      handleOpenQuantityInput,
      updateQuantity,
      handleLongPressIn,
      handleLongPressOut,
    ]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {loading ? (
        <StandLoadingSkeleton />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="cube-outline"
          title={t.standScreen.noItems}
          message={t.standScreen.noItemsMessage}
        />
      ) : (
        <FlatList
          ref={listRef}
          data={rows}
          keyExtractor={(row, index) => String(row[0]?.rowIndex ?? index)}
          renderItem={renderStandRow}
          style={styles.scrollView}
          contentContainerStyle={[
            styles.listContent,
            keyboardHeight > 0 ? { paddingBottom: keyboardHeight + theme.spacing.xl } : null,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          onLayout={(event) => {
            listHeightRef.current = event.nativeEvent.layout.height;
          }}
          onScroll={(event) => {
            scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          removeClippedSubviews
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={5}
          updateCellsBatchingPeriod={32}
          onScrollToIndexFailed={(info) => {
            listRef.current?.scrollToOffset({
              offset: Math.max(0, info.averageItemLength * info.index),
              animated: true,
            });
          }}
          getItemLayout={(_, index) => ({
            length: STAND_ROW_HEIGHT,
            offset: STAND_ROW_HEIGHT * index,
            index,
          })}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  listContent: {
    paddingBottom: theme.spacing.md,
  },
  rowContainer: {
    marginVertical: 10,
    overflow: 'hidden',
  },
  rowWithLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  rowLabel: {
    width: 90,
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    borderTopRightRadius: theme.radius.medium,
    borderBottomRightRadius: theme.radius.medium,
    position: 'absolute',
    left: -45,
    zIndex: 10,
    ...theme.elevation.low,
  },
  rowLabelText: {
    ...theme.typography.h3,
    width: '100%',
    textAlign: 'right',
    paddingRight: theme.spacing.md,
  },
  horizontalScroll: {
    flex: 1,
  },
  horizontalScrollContent: {
    paddingLeft: 55,
    paddingRight: theme.spacing.lg,
  },
});
