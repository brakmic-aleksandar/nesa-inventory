import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useState, useEffect, useRef } from 'react';
import { useNavigation } from 'expo-router';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { theme } from '../constants/theme';
import { useOrder } from '../contexts/OrderContext';
import { db } from '../database/DatabaseService';
import { Stand } from '../database/schema';
import { SHELF_SOURCE_ID } from '../constants';

interface CardScreenProps {
  inputText: string;
  onBackPress: () => void;
  onCardPress: (cardTitle: string, cardIndex: number) => void;
  onShowSummary: () => void;
  refreshKey?: number;
}

interface CardData {
  title: string;
  subtitle: string;
  icon: string;
  color: string;
}

export default function CardScreen({
  inputText,
  onBackPress,
  onCardPress,
  onShowSummary,
  refreshKey,
}: CardScreenProps) {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const { getAllItems, clearAll } = useOrder();
  const navigation = useNavigation();
  const [stands, setStands] = useState<Stand[]>([]);
  const allowNextNavigationRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      try {
        const loadedStands = await db.getAllStands();
        if (isMounted) {
          setStands(loadedStands);
        }
      } catch (error) {
        console.error('Error loading stands:', error);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [refreshKey]);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (event) => {
      if (allowNextNavigationRef.current) {
        allowNextNavigationRef.current = false;
        return;
      }

      const allItems = getAllItems();
      if (allItems.length === 0) {
        return;
      }

      event.preventDefault();

      Alert.alert(t.selectionScreen.clearOrderTitle, t.selectionScreen.clearOrderMessage, [
        {
          text: t.selectionScreen.keepItems,
          style: 'cancel',
          onPress: () => {
            allowNextNavigationRef.current = true;
            navigation.dispatch(event.data.action);
          },
        },
        {
          text: t.selectionScreen.clearItems,
          style: 'destructive',
          onPress: () => {
            clearAll();
            allowNextNavigationRef.current = true;
            navigation.dispatch(event.data.action);
          },
        },
      ]);
    });

    return unsubscribe;
  }, [navigation, getAllItems, clearAll, t]);

  const handleBackPress = () => {
    onBackPress();
  };

  // Last card is always present
  const lastCard: CardData = {
    title: SHELF_SOURCE_ID,
    subtitle: t.selectionScreen.polica,
    icon: 'notifications-outline',
    color: '#FF2D55',
  };

  const handleSendOrder = () => {
    onShowSummary();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons name="arrow-back" size={theme.iconSize.large} color={colors.primary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          {inputText ? (
            <Text style={[styles.headerCustomerText, { color: colors.text }]} numberOfLines={1}>
              {inputText}
            </Text>
          ) : (
            <Text style={[styles.headerCustomerText, { color: colors.text }]} numberOfLines={1}>
              {t.selectionScreen.orderFor}
            </Text>
          )}
        </View>
        <View style={styles.placeholder} />
      </View>

      {/* Card Content */}
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.gridContainer}>
          {/* Dynamic Cards from Database */}
          {stands.map((stand, index) => (
            <TouchableOpacity
              key={stand.id}
              style={[styles.card, { backgroundColor: colors.surface }]}
              onPress={() => onCardPress(stand.name, index)}
            >
              <Text style={[styles.cardTitle, { color: colors.text }]}>{stand.name}</Text>
            </TouchableOpacity>
          ))}

          {/* Last Card (Always Present) */}
          <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.surface }]}
            onPress={() => onCardPress(lastCard.title, stands.length)}
          >
            <Text style={[styles.cardTitle, { color: colors.text }]}>{lastCard.subtitle}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Send Order Button */}
      <View
        style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}
      >
        <TouchableOpacity
          style={[styles.sendOrderButton, { backgroundColor: colors.success }]}
          onPress={handleSendOrder}
        >
          <Ionicons name="send" size={theme.iconSize.medium} color="#fff" />
          <Text style={styles.sendOrderButtonText}>{t.selectionScreen.sendOrder}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.sm,
  },
  backButton: {
    padding: theme.spacing.sm,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.sm,
  },
  headerCustomerText: {
    ...theme.typography.bodyBold,
  },
  placeholder: {
    width: 44,
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
  card: {
    borderRadius: theme.radius.large,
    width: '48%',
    aspectRatio: 1,
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.elevation.medium,
  },
  cardTitle: {
    ...theme.typography.h2,
    textAlign: 'center',
  },
  footer: {
    padding: theme.spacing.lg,
    borderTopWidth: 1,
  },
  sendOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: theme.radius.medium,
    gap: theme.spacing.sm,
    ...theme.elevation.medium,
  },
  sendOrderButtonText: {
    ...theme.typography.h4,
    color: '#fff',
  },
});
