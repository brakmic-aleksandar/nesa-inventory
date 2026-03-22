import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import { CustomerPickerModal } from '../components/CustomerPickerModal';
import { SHELF_SOURCE_ID } from '../constants';
import { theme } from '../constants/theme';
import { useLanguage } from '../contexts/LanguageContext';
import { useOrder } from '../contexts/OrderContext';
import { useTheme } from '../contexts/ThemeContext';
import { db } from '../database/DatabaseService';
import { Stand } from '../database/schema';

interface SelectionScreenProps {
  inputText: string;
  onBackPress: () => void;
  onCardPress: (cardTitle: string, cardIndex: number) => void;
  onShowSummary: () => void;
  onCustomerNameChange?: (name: string) => void;
  refreshKey?: number;
}

interface CardData {
  title: string;
  subtitle: string;
}

export default function SelectionScreen({
  inputText,
  onBackPress,
  onCardPress,
  onShowSummary,
  onCustomerNameChange,
  refreshKey,
}: SelectionScreenProps) {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const { clearAll } = useOrder();
  const [stands, setStands] = useState<Stand[]>([]);
  const [pickerVisible, setPickerVisible] = useState(false);

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

  const handleBackPress = () => {
    clearAll();
    onBackPress();
  };

  const handleEditCustomerName = () => {
    if (!onCustomerNameChange) return;
    setPickerVisible(true);
  };

  const handlePickerSelect = (name: string) => {
    setPickerVisible(false);
    if (onCustomerNameChange && name !== inputText) {
      onCustomerNameChange(name);
    }
  };

  // Last card is always present
  const lastCard: CardData = {
    title: SHELF_SOURCE_ID,
    subtitle: t.selectionScreen.polica,
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
        <TouchableOpacity
          style={styles.headerCenter}
          onPress={handleEditCustomerName}
          activeOpacity={0.7}
          disabled={!onCustomerNameChange}
        >
          {inputText ? (
            <View style={styles.customerNameRow}>
              <Text style={[styles.headerCustomerText, { color: colors.text }]} numberOfLines={1}>
                {inputText}
              </Text>
              {onCustomerNameChange && (
                <Ionicons name="pencil" size={theme.iconSize.small} color={colors.textTertiary} />
              )}
            </View>
          ) : (
            <Text style={[styles.headerCustomerText, { color: colors.text }]} numberOfLines={1}>
              {t.selectionScreen.orderFor}
            </Text>
          )}
        </TouchableOpacity>
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
          <Ionicons name="send" size={theme.iconSize.medium} color={colors.textOnColor} />
          <Text style={[styles.sendOrderButtonText, { color: colors.textOnColor }]}>
            {t.selectionScreen.sendOrder}
          </Text>
        </TouchableOpacity>
      </View>

      <CustomerPickerModal
        visible={pickerVisible}
        currentName={inputText}
        onSelect={handlePickerSelect}
        onClose={() => setPickerVisible(false)}
      />
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
  customerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  headerCustomerText: {
    ...theme.typography.bodyBold,
    flexShrink: 1,
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
  },
});
