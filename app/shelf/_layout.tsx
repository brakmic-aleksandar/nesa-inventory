import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Slot, usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useOrder } from '../../contexts/OrderContext';
import { db } from '../../database/DatabaseService';
import { SHELF_SOURCE_ID } from '../../constants';
import { theme } from '../../constants/theme';
import { FloatingActionButton } from '../../components/FloatingActionButton';

export default function ShelfTabsLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { getAllItems } = useOrder();
  const [stands, setStands] = useState<{ id: number; name: string }[]>([]);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      const loadedStands = await db.getAllStands();
      if (!isMounted) return;

      const sorted = [...loadedStands].sort((a, b) => a.id - b.id);
      setStands(sorted.map((stand) => ({ id: stand.id, name: stand.name })));
    };

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const tabNames = useMemo(() => [...stands.map((stand) => stand.name), SHELF_SOURCE_ID], [stands]);

  const activeStandName = decodeURIComponent(pathname.split('/').pop() || '');
  const totalItemsInOrder = getAllItems().length;

  const handleShowSummary = () => {
    router.push('/summary');
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.tabBarContainer,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.border,
            paddingTop: insets.top + theme.spacing.sm,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
              return;
            }
            router.replace('/selection');
          }}
        >
          <Ionicons name="arrow-back" size={theme.iconSize.large} color={colors.primary} />
        </TouchableOpacity>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}
        >
          {tabNames.map((name) => {
            const focused = activeStandName === name;
            const label = name === SHELF_SOURCE_ID ? t.selectionScreen.polica : name;

            return (
              <TouchableOpacity
                key={name}
                style={[
                  styles.tabPill,
                  {
                    backgroundColor: focused ? colors.primary : colors.surfaceSecondary,
                    borderColor: focused ? colors.primary : colors.border,
                  },
                ]}
                onPress={() =>
                  router.replace({
                    pathname: '/shelf/[stand_name]',
                    params: { stand_name: name },
                  })
                }
              >
                <Text style={{ color: focused ? colors.textOnColor : colors.text }}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <Slot />
      <FloatingActionButton itemCount={totalItemsInOrder} onPress={handleShowSummary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    paddingBottom: theme.spacing.sm,
    minHeight: 64,
    paddingHorizontal: theme.spacing.lg,
    zIndex: 10,
    ...theme.elevation.low,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: theme.radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  tabBarContent: {
    alignItems: 'center',
    paddingRight: 8,
  },
  tabPill: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    minHeight: 44,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
    justifyContent: 'center',
  },
});
