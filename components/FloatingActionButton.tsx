import { TouchableOpacity, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef } from 'react';

import { useTheme } from '../contexts/ThemeContext';
import { theme } from '../constants/theme';

interface FloatingActionButtonProps {
  onPress: () => void;
  itemCount: number;
}

export function FloatingActionButton({ onPress, itemCount }: FloatingActionButtonProps) {
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const badgeScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (itemCount > 0) {
      // Bounce animation when count changes
      Animated.sequence([
        Animated.spring(badgeScale, {
          toValue: 1.3,
          useNativeDriver: true,
          tension: 100,
          friction: 3,
        }),
        Animated.spring(badgeScale, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 5,
        }),
      ]).start();
    }
  }, [itemCount]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 100,
      friction: 5,
    }).start();
  };

  if (itemCount === 0) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.success }]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.9}
      >
        <Ionicons name="send" size={24} color={colors.textOnColor} />
        <Animated.View
          style={[
            styles.badge,
            {
              backgroundColor: colors.error,
              borderColor: colors.surface,
              transform: [{ scale: badgeScale }],
            },
          ]}
        >
          <Text style={[styles.badgeText, { color: colors.textOnColor }]}>
            {itemCount > 99 ? '99+' : itemCount}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 1000,
  },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.elevation.highest,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
