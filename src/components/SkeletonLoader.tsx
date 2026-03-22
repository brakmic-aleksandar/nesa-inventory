import { useEffect, useRef } from 'react';
import { Animated, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { theme } from '../constants/theme';
import { useTheme } from '../contexts/ThemeContext';

interface SkeletonLoaderProps {
  width?: number | `${number}%` | 'auto';
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function SkeletonLoader({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}: SkeletonLoaderProps) {
  const { colors } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          backgroundColor: colors.skeleton,
          width,
          height,
          borderRadius,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, ...theme.elevation.medium }]}>
      <SkeletonLoader width="100%" height={160} borderRadius={0} style={{ marginBottom: 10 }} />
      <SkeletonLoader width="80%" height={16} style={{ marginBottom: 12, marginLeft: 10 }} />
      <SkeletonLoader width="100%" height={50} borderRadius={0} />
    </View>
  );
}

export function SkeletonStandItem() {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.standItem, { backgroundColor: colors.surface, ...theme.elevation.medium }]}
    >
      <SkeletonLoader width={180} height={150} borderRadius={12} style={{ marginBottom: 10 }} />
      <SkeletonLoader width={140} height={16} style={{ marginBottom: 8, marginLeft: 20 }} />
      <SkeletonLoader width={180} height={50} borderRadius={12} />
    </View>
  );
}

export function SkeletonRow() {
  return (
    <View style={styles.row}>
      <SkeletonLoader width={90} height={250} borderRadius={12} style={{ marginRight: 15 }} />
      <View style={{ flexDirection: 'row' }}>
        <SkeletonStandItem />
        <SkeletonStandItem />
        <SkeletonStandItem />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radius.medium,
    padding: 0,
    width: '30%',
    marginBottom: 15,
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  standItem: {
    borderRadius: theme.radius.medium,
    padding: 0,
    marginRight: 15,
    width: 180,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    marginVertical: 10,
    paddingLeft: 10,
  },
});
