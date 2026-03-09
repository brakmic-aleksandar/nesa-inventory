import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Href, Link } from 'expo-router';
import { memo } from 'react';

import { theme } from '../constants/theme';

interface ShelfItemCardProps {
  item: {
    id: number;
    name: string;
    image: string;
    quantity: number;
  };
  isDark: boolean;
  colors: {
    surface: string;
    border: string;
    primary: string;
    surfaceSecondary: string;
    text: string;
    textSecondary: string;
    textOnColor: string;
  };
  scaleAnim: Animated.Value;
  showPresets: boolean;
  detailsHref: Href;
  onDecrease: () => void;
  onDecreasePressIn: () => void;
  onDecreasePressOut: () => void;
  onIncrease: () => void;
  onIncreasePressIn: () => void;
  onIncreasePressOut: () => void;
  onOpenPresets: () => void;
  onClosePresets: () => void;
  onSetPreset: (quantity: number) => void;
}

function ShelfItemCardComponent({
  item,
  isDark,
  colors,
  scaleAnim,
  showPresets,
  detailsHref,
  onDecrease,
  onDecreasePressIn,
  onDecreasePressOut,
  onIncrease,
  onIncreasePressIn,
  onIncreasePressOut,
  onOpenPresets,
  onClosePresets,
  onSetPreset,
}: ShelfItemCardProps) {
  return (
    <View
      style={[
        styles.articleCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        item.quantity > 0 && [
          styles.articleCardWithQuantity,
          { borderColor: colors.primary, shadowColor: colors.primary },
        ],
      ]}
    >
      <Link href={detailsHref} push asChild>
        <TouchableOpacity activeOpacity={0.85}>
          <View style={styles.zoomSource}>
            <View
              style={[
                styles.articleImage,
                {
                  backgroundColor: colors.surfaceSecondary,
                  justifyContent: 'center',
                  alignItems: 'center',
                },
              ]}
            >
              {item.image !== 'placeholder' ? (
                <Image
                  source={{ uri: item.image }}
                  style={{ width: '100%', height: 160 }}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={120}
                  recyclingKey={String(item.id)}
                />
              ) : (
                <Ionicons name="image-outline" size={160} color={isDark ? theme.dark.placeholderIcon : theme.light.placeholderIcon} />
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Link>

      <Text style={[styles.articleName, { color: colors.text }]}>{item.name}</Text>

      {showPresets ? (
        <View style={[styles.presetsContainer, { backgroundColor: colors.surfaceSecondary }]}>
          {[5, 10, 20, 50].map((value) => (
            <TouchableOpacity
              key={String(value)}
              style={[styles.presetButton, { backgroundColor: colors.primary }]}
              onPress={() => onSetPreset(value)}
            >
              <Text style={styles.presetButtonText}>{value}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.presetCloseButton, { backgroundColor: colors.surfaceSecondary }]}
            onPress={onClosePresets}
          >
            <Ionicons name="close" size={theme.iconSize.small} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.quantityRow}>
          <TouchableOpacity
            style={[styles.minusButton, { backgroundColor: colors.primary }]}
            onPress={onDecrease}
            onPressIn={onDecreasePressIn}
            onPressOut={onDecreasePressOut}
            delayLongPress={500}
          >
            <Ionicons name="remove" size={theme.iconSize.medium} color={colors.textOnColor} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.quantityDisplay} onPress={onOpenPresets}>
            <Animated.Text
              style={[
                styles.quantityText,
                { color: colors.text },
                { transform: [{ scale: scaleAnim }] },
              ]}
            >
              {item.quantity}
            </Animated.Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.plusButton, { backgroundColor: colors.primary }]}
            onPress={onIncrease}
            onPressIn={onIncreasePressIn}
            onPressOut={onIncreasePressOut}
            delayLongPress={500}
          >
            <Ionicons name="add" size={theme.iconSize.medium} color={colors.textOnColor} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export const ShelfItemCard = memo(ShelfItemCardComponent, (prev, next) => {
  return (
    prev.item === next.item &&
    prev.isDark === next.isDark &&
    prev.colors === next.colors &&
    prev.scaleAnim === next.scaleAnim &&
    prev.showPresets === next.showPresets
  );
});

const styles = StyleSheet.create({
  articleCard: {
    borderRadius: theme.radius.medium,
    borderWidth: 1,
    width: '30%',
    padding: 0,
    marginBottom: theme.spacing.md,
    alignItems: 'stretch',
    overflow: 'hidden',
    ...theme.elevation.low,
  },
  articleCardWithQuantity: {
    borderWidth: 2,
    borderRadius: theme.radius.medium,
    ...theme.elevation.high,
  },
  articleImage: {
    borderTopLeftRadius: theme.radius.medium,
    borderTopRightRadius: theme.radius.medium,
  },
  zoomSource: {
    width: '100%',
  },
  articleName: {
    ...theme.typography.bodySmall,
    fontWeight: '600',
    marginTop: theme.spacing.sm,
    marginHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 50,
    position: 'relative',
  },
  minusButton: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: theme.radius.medium,
  },
  plusButton: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomRightRadius: theme.radius.medium,
  },
  quantityDisplay: {
    backgroundColor: 'transparent',
    paddingHorizontal: theme.spacing.lg,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
  },
  quantityText: {
    ...theme.typography.h4,
  },
  presetsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    height: 50,
    borderBottomLeftRadius: theme.radius.medium,
    borderBottomRightRadius: theme.radius.medium,
    paddingHorizontal: 2,
  },
  presetButton: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radius.small,
    minWidth: 28,
    alignItems: 'center',
  },
  presetButtonText: {
    ...theme.typography.tiny,
    color: theme.light.textOnColor,
  },
  presetCloseButton: {
    width: 28,
    height: 28,
    borderRadius: theme.radius.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
