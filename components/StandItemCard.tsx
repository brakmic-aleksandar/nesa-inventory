import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Href, Link } from 'expo-router';
import { memo } from 'react';

import { theme } from '../constants/theme';

interface StandItemCardProps {
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

function StandItemCardComponent({
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
}: StandItemCardProps) {
  return (
    <View
      style={[
        styles.itemCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        item.quantity > 0 && [
          styles.itemCardWithQuantity,
          { borderColor: colors.primary, shadowColor: colors.primary },
        ],
      ]}
    >
      <Link href={detailsHref} push asChild>
        <TouchableOpacity activeOpacity={0.85} style={styles.triggerArea}>
          <View style={styles.zoomSource}>
            {item.image !== 'placeholder' ? (
              <Image
                source={{ uri: item.image }}
                style={[styles.itemImage, { backgroundColor: colors.surfaceSecondary }]}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={120}
                recyclingKey={String(item.id)}
                onError={(error: unknown) => {
                  console.error(`❌ Failed to load image for ${item.name}:`, item.image, error);
                }}
              />
            ) : (
              <View
                style={[
                  styles.itemImage,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    justifyContent: 'center',
                    alignItems: 'center',
                  },
                ]}
              >
                <Ionicons name="image-outline" size={120} color={isDark ? '#666' : '#999'} />
              </View>
            )}
          </View>
        </TouchableOpacity>
      </Link>

      <Text style={[styles.itemName, { color: colors.text }]}>{item.name}</Text>

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
            <Ionicons name="close" size={20} color={colors.textSecondary} />
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
            <Ionicons name="remove" size={theme.iconSize.medium} color="#fff" />
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
            <Ionicons name="add" size={theme.iconSize.medium} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

export const StandItemCard = memo(StandItemCardComponent, (prev, next) => {
  return (
    prev.item === next.item &&
    prev.isDark === next.isDark &&
    prev.colors === next.colors &&
    prev.scaleAnim === next.scaleAnim &&
    prev.showPresets === next.showPresets
  );
});

const styles = StyleSheet.create({
  itemCard: {
    borderRadius: theme.radius.medium,
    borderWidth: 1,
    padding: 0,
    marginRight: theme.spacing.md,
    width: 180,
    alignItems: 'center',
    overflow: 'hidden',
    ...theme.elevation.low,
  },
  itemCardWithQuantity: {
    borderWidth: 2,
    borderRadius: theme.radius.medium,
    ...theme.elevation.high,
  },
  itemImage: {
    width: '100%',
    height: 150,
    borderTopLeftRadius: theme.radius.medium,
    borderTopRightRadius: theme.radius.medium,
  },
  triggerArea: {
    width: '100%',
  },
  zoomSource: {
    width: '100%',
  },
  itemName: {
    ...theme.typography.body,
    marginTop: theme.spacing.sm,
    marginHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
    minHeight: 40,
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
    paddingHorizontal: 20,
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
    paddingHorizontal: theme.spacing.xs,
  },
  presetButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.small,
    minWidth: 35,
    alignItems: 'center',
  },
  presetButtonText: {
    ...theme.typography.caption,
    color: '#fff',
  },
  presetCloseButton: {
    width: 32,
    height: 32,
    borderRadius: theme.radius.round,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
