import {
  StyleSheet,
  Text,
  View,
  Animated,
  FlatList,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useOrder } from '../contexts/OrderContext';
import { theme } from '../constants/theme';
import { db } from '../database/DatabaseService';
import { SkeletonRow } from '../components/SkeletonLoader';
import { EmptyState } from '../components/EmptyState';
import { ItemCard } from '../components/ItemCard';

interface InventoryScreenProps {
  cardTitle: string;
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

const STAND_CARD_WIDTH = 180;
const STAND_CARD_GAP = theme.spacing.md;
const STAND_CARD_FULL_WIDTH = STAND_CARD_WIDTH + STAND_CARD_GAP;
const STAND_ROW_HEIGHT = 270;

export default function InventoryScreen({ cardTitle }: InventoryScreenProps) {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const { getItems, setItems } = useOrder();
  const [rows, setRows] = useState<Item[][]>([]);
  const [loading, setLoading] = useState(true);
  const [quantityInputTarget, setQuantityInputTarget] = useState<{ rowIndex: number; itemId: number } | null>(null);
  const scaleAnims = useRef<Map<string, Animated.Value>>(new Map());
  const longPressTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const longPressIntervals = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const getItemsRef = useRef(getItems);
  const syncItemsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    getItemsRef.current = getItems;
  }, [getItems]);

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

        const groupedRows: Item[][] = Array.from(rowMap.entries())
          .sort(([rowA], [rowB]) => rowA - rowB)
          .map(([, rowItems]) => rowItems);
        setRows(groupedRows);
        // Load saved quantities from context
        const savedItems = getItemsRef.current(cardTitle);
        if (savedItems.length > 0) {
          const savedByKey = new Map<string, { quantity: number; colorOrder: number | null }>();
          for (const saved of savedItems) {
            const key = `${saved.name}::${saved.colorNumber ?? ''}::${saved.colorOrder ?? ''}`;
            savedByKey.set(key, {
              quantity: saved.quantity,
              colorOrder: saved.colorOrder ?? null,
            });
          }

          const updatedRows = groupedRows.map((row) =>
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
          setRows(updatedRows);
        }
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
    }, 120);

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
        }, 110);
        longPressIntervals.current.set(key, interval);
      }, 500);

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
                      quantityInputTarget?.rowIndex === rowIndex && quantityInputTarget?.itemId === item.id
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
                    onOpenQuantityInput={() => setQuantityInputTarget({ rowIndex, itemId: item.id })}
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
      updateQuantity,
      handleLongPressIn,
      handleLongPressOut,
    ]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Loading State */}
      {loading ? (
        <ScrollView style={styles.scrollView}>
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </ScrollView>
      ) : rows.length === 0 ? (
        <EmptyState
          icon="cube-outline"
          title={t.standScreen.noItems}
          message={t.standScreen.noItemsMessage}
        />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(row, index) => String(row[0]?.rowIndex ?? index)}
          renderItem={renderStandRow}
          style={styles.scrollView}
          removeClippedSubviews
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={5}
          updateCellsBatchingPeriod={32}
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
