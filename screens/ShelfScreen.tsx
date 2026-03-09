import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as Haptics from 'expo-haptics';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { theme } from '../constants/theme';
import { useOrder } from '../contexts/OrderContext';
import { db } from '../database/DatabaseService';
import { SHELF_SOURCE_ID } from '../constants';
import { SkeletonCard } from '../components/SkeletonLoader';
import { EmptyState } from '../components/EmptyState';
import { ItemCard } from '../components/ItemCard';

interface Article {
  id: number;
  name: string;
  quantity: number;
  image: string;
}

export default function ArticlesScreen() {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const { getItems, setItems } = useOrder();
  const [searchQuery, setSearchQuery] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantityInputTarget, setQuantityInputTarget] = useState<number | null>(null);
  const scaleAnims = useRef<Map<number, Animated.Value>>(new Map());
  const longPressTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const longPressIntervals = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());
  const syncItemsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shelfCardColors = useMemo(
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
    let isMounted = true;

    const load = async () => {
      try {
        const dbItems = await db.getAllShelfItems();

        if (!isMounted) return;

        const loadedArticles = dbItems.map((item) => {
          // Handle local file paths by adding file:// prefix if needed
          let imageUri = null;
          if (item.image_path) {
            if (
              item.image_path.startsWith('file://') ||
              item.image_path.startsWith('http://') ||
              item.image_path.startsWith('https://')
            ) {
              imageUri = item.image_path;
            } else {
              // Local file path, add file:// prefix
              imageUri = `file://${item.image_path}`;
            }
          }

          return {
            id: item.id,
            name: item.name,
            quantity: 0,
            image: imageUri || 'placeholder',
          };
        });

        setArticles(loadedArticles);

        // Load saved quantities from context
        const savedItems = getItems(SHELF_SOURCE_ID);
        if (savedItems.length > 0) {
          const quantityMap: Record<number, number> = {};
          savedItems.forEach((item) => {
            quantityMap[item.id] = item.quantity;
          });

          const updatedArticles = loadedArticles.map((article) => ({
            ...article,
            quantity: quantityMap[article.id] || article.quantity,
          }));
          if (isMounted) {
            setArticles(updatedArticles);
          }
        }

        if (isMounted) {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading shelf items:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    // Cleanup timers on unmount to prevent memory leaks
    return () => {
      longPressTimers.current.forEach((timer) => clearTimeout(timer));
      longPressTimers.current.clear();
      longPressIntervals.current.forEach((interval) => clearInterval(interval));
      longPressIntervals.current.clear();
    };
  }, []);

  useEffect(() => {
    // Batch context sync to avoid pushing a full payload on every single +/- tap.
    if (loading) {
      return;
    }

    if (syncItemsTimer.current) {
      clearTimeout(syncItemsTimer.current);
    }

    syncItemsTimer.current = setTimeout(() => {
      setItems(
        SHELF_SOURCE_ID,
        articles.map((article) => ({
          ...article,
          colorNumber: null,
          itemCode: null,
          colorOrder: null,
        }))
      );
    }, 120);

    return () => {
      if (syncItemsTimer.current) {
        clearTimeout(syncItemsTimer.current);
        syncItemsTimer.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articles, loading, setItems]);

  const filteredArticles = useMemo(
    () =>
      articles.filter((article) => article.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [articles, searchQuery]
  );

  const updateQuantity = useCallback((articleId: number, delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setArticles((prevArticles) =>
      prevArticles.map((article) => {
        if (article.id === articleId) {
          const nextQuantity = Math.max(0, article.quantity + delta);
          if (nextQuantity === article.quantity) {
            return article;
          }

          // Animate quantity change
          if (!scaleAnims.current.has(articleId)) {
            scaleAnims.current.set(articleId, new Animated.Value(1));
          }
          const anim = scaleAnims.current.get(articleId)!;
          Animated.sequence([
            Animated.timing(anim, { toValue: 1.3, duration: 100, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 1, duration: 100, useNativeDriver: true }),
          ]).start();

          return { ...article, quantity: nextQuantity };
        }
        return article;
      })
    );
  }, []);

  const handleLongPressIn = useCallback((articleId: number, delta: number) => {
    const key = `${articleId}-${delta}`;

    // Start long press after 500ms
    const timer = setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // Start rapid increment/decrement
      const interval = setInterval(() => {
        updateQuantity(articleId, delta);
      }, 100);
      longPressIntervals.current.set(key, interval);
    }, 500);

    longPressTimers.current.set(key, timer);
  }, [updateQuantity]);

  const handleLongPressOut = useCallback((articleId: number, delta: number) => {
    const key = `${articleId}-${delta}`;

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

  const setDirectQuantity = useCallback((articleId: number, quantity: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setArticles((prevArticles) =>
      prevArticles.map((article) => (article.id === articleId ? { ...article, quantity } : article))
    );
  }, []);

  const renderArticleItem = useCallback(({ item: article }: { item: Article }) => {
    const scaleAnim = scaleAnims.current.get(article.id) || new Animated.Value(1);
    if (!scaleAnims.current.has(article.id)) {
      scaleAnims.current.set(article.id, scaleAnim);
    }

    return (
      <ItemCard
        item={article}
        colors={shelfCardColors}
        scaleAnim={scaleAnim}
        showQuantityInput={quantityInputTarget === article.id}
        detailsHref={{
          pathname: '/shelf-item-details',
          params: {
            id: String(article.id),
            name: article.name,
            image: article.image,
            quantity: String(article.quantity),
          },
        }}
        variant="shelf"
        onDecrease={() => updateQuantity(article.id, -1)}
        onDecreasePressIn={() => handleLongPressIn(article.id, -1)}
        onDecreasePressOut={() => handleLongPressOut(article.id, -1)}
        onIncrease={() => updateQuantity(article.id, 1)}
        onIncreasePressIn={() => handleLongPressIn(article.id, 1)}
        onIncreasePressOut={() => handleLongPressOut(article.id, 1)}
        onOpenQuantityInput={() => setQuantityInputTarget(article.id)}
        onCloseQuantityInput={() => setQuantityInputTarget(null)}
        onSetQuantity={(quantity) => setDirectQuantity(article.id, quantity)}
      />
    );
  }, [
    quantityInputTarget,
    shelfCardColors,
    setDirectQuantity,
    updateQuantity,
    handleLongPressIn,
    handleLongPressOut,
  ]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Search Bar */}
      <View
        style={[
          styles.searchContainer,
          { backgroundColor: colors.surface, borderColor: colors.border },
        ]}
      >
        <Ionicons
          name="search"
          size={theme.iconSize.small}
          color={colors.textSecondary}
          style={styles.searchIcon}
        />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          placeholder={t.shelfScreen.searchPlaceholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.textTertiary}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Ionicons
              name="close-circle"
              size={theme.iconSize.small}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.searchMetaRow}>
        <Text style={[styles.searchMetaText, { color: colors.textSecondary }]}>
          {searchQuery.length > 0
            ? filteredArticles.length === 1
              ? t.shelfScreen.resultsCountSingular.replace(
                  '{count}',
                  String(filteredArticles.length)
                )
              : t.shelfScreen.resultsCountPlural.replace('{count}', String(filteredArticles.length))
            : articles.length === 1
              ? t.shelfScreen.totalArticlesSingular.replace('{count}', String(articles.length))
              : t.shelfScreen.totalArticlesPlural.replace('{count}', String(articles.length))}
        </Text>
      </View>

      {/* Grid Content */}
      {loading ? (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.gridContainer}>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        </ScrollView>
      ) : filteredArticles.length === 0 && searchQuery.length === 0 ? (
        <EmptyState
          icon="cube-outline"
          title={t.shelfScreen.noItems}
          message={t.shelfScreen.noItemsMessage}
        />
      ) : filteredArticles.length === 0 ? (
        <EmptyState
          icon="search-outline"
          title={t.shelfScreen.noResults}
          message={t.shelfScreen.noResultsMessage}
        />
      ) : (
        <FlatList
          data={filteredArticles}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderArticleItem}
          numColumns={3}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          columnWrapperStyle={styles.gridContainer}
          removeClippedSubviews
          initialNumToRender={12}
          maxToRenderPerBatch={18}
          windowSize={7}
          updateCellsBatchingPeriod={32}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.medium,
    borderWidth: 1,
    minHeight: 48,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...theme.typography.body,
  },
  clearButton: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchMetaRow: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  searchMetaText: {
    ...theme.typography.caption,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: theme.spacing.md,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
});
