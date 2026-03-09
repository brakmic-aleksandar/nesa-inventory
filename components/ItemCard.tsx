import { memo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Href, Link } from 'expo-router';

import { TIMING } from '../constants';
import { theme } from '../constants/theme';

interface ItemCardColors {
  surface: string;
  border: string;
  primary: string;
  surfaceSecondary: string;
  text: string;
  textSecondary: string;
  textOnColor: string;
  placeholderIcon: string;
}

interface ItemCardProps {
  item: {
    id: number;
    name: string;
    image: string;
    quantity: number;
  };
  colors: ItemCardColors;
  scaleAnim: Animated.Value;
  showQuantityInput: boolean;
  detailsHref: Href;
  variant: 'stand' | 'shelf';
  onDecrease: () => void;
  onDecreasePressIn: () => void;
  onDecreasePressOut: () => void;
  onIncrease: () => void;
  onIncreasePressIn: () => void;
  onIncreasePressOut: () => void;
  onOpenQuantityInput: () => void;
  onCloseQuantityInput: () => void;
  onSetQuantity: (quantity: number) => void;
}

function StandImageSection({
  item,
  colors,
}: {
  item: ItemCardProps['item'];
  colors: ItemCardColors;
}) {
  return item.image !== 'placeholder' ? (
    <Image
      source={{ uri: item.image }}
      style={[styles.standImage, { backgroundColor: colors.surfaceSecondary }]}
      contentFit="cover"
      cachePolicy="memory-disk"
      transition={TIMING.IMAGE_TRANSITION}
      recyclingKey={String(item.id)}
    />
  ) : (
    <View
      style={[
        styles.standImage,
        {
          backgroundColor: colors.surfaceSecondary,
          justifyContent: 'center',
          alignItems: 'center',
        },
      ]}
    >
      <Ionicons name="image-outline" size={120} color={colors.placeholderIcon} />
    </View>
  );
}

function ShelfImageSection({
  item,
  colors,
  imageHeight,
}: {
  item: ItemCardProps['item'];
  colors: ItemCardColors;
  imageHeight: number;
}) {
  return (
    <View
      style={[
        styles.shelfImage,
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
          style={{ width: '100%', height: imageHeight }}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={TIMING.IMAGE_TRANSITION}
          recyclingKey={String(item.id)}
        />
      ) : (
        <Ionicons name="image-outline" size={160} color={colors.placeholderIcon} />
      )}
    </View>
  );
}

function QuantityInput({
  inputRef,
  inputValue,
  setInputValue,
  onSubmit,
  colors,
}: {
  inputRef: React.RefObject<TextInput | null>;
  inputValue: string;
  setInputValue: (value: string) => void;
  onSubmit: () => void;
  colors: ItemCardColors;
}) {
  return (
    <View style={[styles.quantityInputContainer, { backgroundColor: colors.surfaceSecondary }]}>
      <TextInput
        ref={inputRef}
        style={[styles.quantityInput, { color: colors.text, borderColor: colors.border }]}
        value={inputValue}
        onChangeText={(text) => setInputValue(text.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        returnKeyType="done"
        selectTextOnFocus
        onSubmitEditing={onSubmit}
        onBlur={onSubmit}
        maxLength={5}
      />
      <TouchableOpacity
        style={[styles.quantitySubmitButton, { backgroundColor: colors.primary }]}
        onPress={onSubmit}
      >
        <Ionicons name="checkmark" size={theme.iconSize.small} color={colors.textOnColor} />
      </TouchableOpacity>
    </View>
  );
}

function QuantityControls({
  quantity,
  scaleAnim,
  colors,
  onDecrease,
  onDecreasePressIn,
  onDecreasePressOut,
  onIncrease,
  onIncreasePressIn,
  onIncreasePressOut,
  onOpenInput,
}: {
  quantity: number;
  scaleAnim: Animated.Value;
  colors: ItemCardColors;
  onDecrease: () => void;
  onDecreasePressIn: () => void;
  onDecreasePressOut: () => void;
  onIncrease: () => void;
  onIncreasePressIn: () => void;
  onIncreasePressOut: () => void;
  onOpenInput: () => void;
}) {
  return (
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

      <TouchableOpacity style={styles.quantityDisplay} onPress={onOpenInput}>
        <Animated.Text
          style={[
            styles.quantityText,
            { color: colors.text },
            { transform: [{ scale: scaleAnim }] },
          ]}
        >
          {quantity}
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
  );
}

function ItemCardComponent({
  item,
  colors,
  scaleAnim,
  showQuantityInput,
  detailsHref,
  variant,
  onDecrease,
  onDecreasePressIn,
  onDecreasePressOut,
  onIncrease,
  onIncreasePressIn,
  onIncreasePressOut,
  onOpenQuantityInput,
  onCloseQuantityInput,
  onSetQuantity,
}: ItemCardProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<TextInput>(null);
  const isStand = variant === 'stand';

  const handleSubmitQuantity = () => {
    const parsed = parseInt(inputValue, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      onSetQuantity(parsed);
    }
    setInputValue('');
    onCloseQuantityInput();
  };

  const handleOpenInput = () => {
    setInputValue(item.quantity > 0 ? String(item.quantity) : '');
    onOpenQuantityInput();
    setTimeout(() => inputRef.current?.focus(), TIMING.INPUT_FOCUS_DELAY);
  };

  const cardStyle = isStand ? styles.standCard : styles.shelfCard;
  const cardActiveStyle = isStand ? styles.standCardWithQuantity : styles.shelfCardWithQuantity;
  const imageHeight = isStand ? 150 : 160;

  return (
    <View
      style={[
        cardStyle,
        { backgroundColor: colors.surface, borderColor: colors.border },
        item.quantity > 0 && [
          cardActiveStyle,
          { borderColor: colors.primary, shadowColor: colors.primary },
        ],
      ]}
    >
      <Link href={detailsHref} push asChild>
        <TouchableOpacity activeOpacity={0.85} style={isStand ? styles.triggerArea : undefined}>
          <View style={styles.zoomSource}>
            {isStand ? (
              <StandImageSection item={item} colors={colors} />
            ) : (
              <ShelfImageSection item={item} colors={colors} imageHeight={imageHeight} />
            )}
          </View>
        </TouchableOpacity>
      </Link>

      <Text style={[isStand ? styles.standName : styles.shelfName, { color: colors.text }]}>
        {item.name}
      </Text>

      {showQuantityInput ? (
        <QuantityInput
          inputRef={inputRef}
          inputValue={inputValue}
          setInputValue={setInputValue}
          onSubmit={handleSubmitQuantity}
          colors={colors}
        />
      ) : (
        <QuantityControls
          quantity={item.quantity}
          scaleAnim={scaleAnim}
          colors={colors}
          onDecrease={onDecrease}
          onDecreasePressIn={onDecreasePressIn}
          onDecreasePressOut={onDecreasePressOut}
          onIncrease={onIncrease}
          onIncreasePressIn={onIncreasePressIn}
          onIncreasePressOut={onIncreasePressOut}
          onOpenInput={handleOpenInput}
        />
      )}
    </View>
  );
}

export const ItemCard = memo(ItemCardComponent, (prev, next) => {
  return (
    prev.item === next.item &&
    prev.colors === next.colors &&
    prev.scaleAnim === next.scaleAnim &&
    prev.showQuantityInput === next.showQuantityInput &&
    prev.variant === next.variant
  );
});

const styles = StyleSheet.create({
  // Stand variant
  standCard: {
    borderRadius: theme.radius.medium,
    borderWidth: 1,
    padding: 0,
    marginRight: theme.spacing.md,
    width: 180,
    alignItems: 'center',
    overflow: 'hidden',
    ...theme.elevation.low,
  },
  standCardWithQuantity: {
    borderWidth: 2,
    borderRadius: theme.radius.medium,
    ...theme.elevation.high,
  },
  standImage: {
    width: '100%',
    height: 150,
    borderTopLeftRadius: theme.radius.medium,
    borderTopRightRadius: theme.radius.medium,
  },
  standName: {
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
  triggerArea: {
    width: '100%',
  },

  // Shelf variant
  shelfCard: {
    borderRadius: theme.radius.medium,
    borderWidth: 1,
    width: '30%',
    padding: 0,
    marginBottom: theme.spacing.md,
    alignItems: 'stretch',
    overflow: 'hidden',
    ...theme.elevation.low,
  },
  shelfCardWithQuantity: {
    borderWidth: 2,
    borderRadius: theme.radius.medium,
    ...theme.elevation.high,
  },
  shelfImage: {
    borderTopLeftRadius: theme.radius.medium,
    borderTopRightRadius: theme.radius.medium,
  },
  shelfName: {
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

  // Shared
  zoomSource: {
    width: '100%',
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
  quantityInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 50,
    borderBottomLeftRadius: theme.radius.medium,
    borderBottomRightRadius: theme.radius.medium,
    paddingHorizontal: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  quantityInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderRadius: theme.radius.small,
    textAlign: 'center',
    ...theme.typography.h4,
    paddingHorizontal: theme.spacing.sm,
  },
  quantitySubmitButton: {
    width: 36,
    height: 36,
    borderRadius: theme.radius.small,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
