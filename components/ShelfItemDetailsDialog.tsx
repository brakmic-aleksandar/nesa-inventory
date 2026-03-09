import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { theme } from '../constants/theme';

interface ShelfItemDetailsDialogProps {
  id?: number;
  name: string;
  image?: string;
  quantity?: number;
  onClose: () => void;
}

export function ShelfItemDetailsDialog({
  id,
  name,
  image,
  quantity,
  onClose,
}: ShelfItemDetailsDialogProps) {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();

  const hasImage = Boolean(image && image !== 'placeholder');

  return (
    <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View style={[styles.card, { backgroundColor: colors.surface }]}>
        <Pressable
          style={[styles.closeButton, { backgroundColor: colors.surfaceSecondary }]}
          onPress={onClose}
        >
          <Ionicons name="close" size={theme.iconSize.large} color={colors.textSecondary} />
        </Pressable>

        {hasImage ? (
          <Image source={{ uri: image }} style={styles.image} contentFit="cover" />
        ) : (
          <View style={styles.emptyImage}>
            <Ionicons name="image-outline" size={160} color={colors.placeholderIcon} />
          </View>
        )}

        <View style={styles.detailsContainer}>
          <Text style={[styles.itemName, { color: colors.text }]}>{name}</Text>

          {quantity !== undefined ? (
            <View style={[styles.detailRow, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                {t.itemModal.currentQuantity}:
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{quantity}</Text>
            </View>
          ) : null}

          {id !== undefined ? (
            <View style={[styles.detailRow, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>
                {t.itemModal.itemId}:
              </Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{id}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: theme.radius.large,
    overflow: 'hidden',
    ...theme.elevation.high,
  },
  closeButton: {
    position: 'absolute',
    top: theme.spacing.md,
    right: theme.spacing.md,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: 320,
    backgroundColor: 'transparent',
  },
  emptyImage: {
    width: '100%',
    height: 320,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailsContainer: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  itemName: {
    ...theme.typography.h4,
    marginBottom: theme.spacing.xs,
  },
  detailRow: {
    borderRadius: theme.radius.medium,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    ...theme.typography.body,
  },
  detailValue: {
    ...theme.typography.bodyBold,
  },
});
