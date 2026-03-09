import { useCallback, useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { BeaverLogo } from '../components/BeaverLogo';
import { ImportProgressModal } from '../components/ImportProgressModal';
import { Toast } from '../components/Toast';
import { theme } from '../constants/theme';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { Customer } from '../database/schema';
import { useCustomers } from '../hooks/useCustomers';
import { useImportData } from '../hooks/useImportData';

interface StartScreenProps {
  onStartPress: (text: string) => void;
  onSettingsPress: () => void;
  refreshKey?: number;
}

function EmptyCustomersView({
  colors,
  t,
  onImport,
}: {
  colors: ReturnType<typeof useTheme>['colors'];
  t: ReturnType<typeof useLanguage>['t'];
  onImport: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.emptyCustomerState}
      onPress={onImport}
      activeOpacity={0.7}
    >
      <Ionicons name="people-outline" size={60} color={colors.textTertiary} />
      <Text style={[styles.emptyCustomerText, { color: colors.textSecondary }]}>
        {t.startScreen.noCustomers}
      </Text>
      <Text style={[styles.emptyCustomerSubtext, { color: colors.textTertiary }]}>
        {t.startScreen.importCustomersHint}
      </Text>
    </TouchableOpacity>
  );
}

function CustomerListView({
  colors,
  t,
  customerSearch,
  setCustomerSearch,
  filteredCustomers,
  onSelect,
}: {
  colors: ReturnType<typeof useTheme>['colors'];
  t: ReturnType<typeof useLanguage>['t'];
  customerSearch: string;
  setCustomerSearch: (value: string) => void;
  filteredCustomers: Customer[];
  onSelect: (customer: Customer) => void;
}) {
  return (
    <>
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
          placeholder={t.startScreen.searchCustomers}
          value={customerSearch}
          onChangeText={setCustomerSearch}
          placeholderTextColor={colors.textTertiary}
        />
        {customerSearch.length > 0 && (
          <TouchableOpacity onPress={() => setCustomerSearch('')} style={styles.clearButton}>
            <Ionicons
              name="close-circle"
              size={theme.iconSize.small}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      {filteredCustomers.length === 0 ? (
        <View style={styles.noResultsContainer}>
          <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>
            {t.startScreen.noCustomersFound}
          </Text>
        </View>
      ) : (
        <ScrollView
          style={styles.customerScrollView}
          contentContainerStyle={styles.customerScrollContent}
          showsVerticalScrollIndicator={true}
        >
          {filteredCustomers.map((customer) => (
            <TouchableOpacity
              key={customer.id}
              style={[
                styles.customerCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  ...theme.elevation.low,
                },
              ]}
              activeOpacity={0.7}
              onPress={() => onSelect(customer)}
            >
              <View style={styles.customerCardContent}>
                <Ionicons
                  name="person-outline"
                  size={theme.iconSize.medium}
                  color={colors.primary}
                />
                <Text style={[styles.customerCardText, { color: colors.text }]}>
                  {customer.name}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={theme.iconSize.medium}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </>
  );
}

export default function StartScreen({ onStartPress, onSettingsPress, refreshKey }: StartScreenProps) {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const [customerSearch, setCustomerSearch] = useState('');
  const {
    customers,
    hasNewDataAvailable,
    setHasNewDataAvailable,
    loadCustomers,
    refreshStatusAndCustomers,
  } = useCustomers(refreshKey);
  const { importProgress, runImport, runImportFromBookmark, checkImportedFileChange } =
    useImportData();

  useFocusEffect(
    useCallback(() => {
      refreshStatusAndCustomers();
    }, [refreshStatusAndCustomers])
  );

  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLowerCase().includes(customerSearch.toLowerCase().trim())
  );

  const handleImportCustomers = async () => {
    try {
      await checkImportedFileChange();

      const result = hasNewDataAvailable ? await runImportFromBookmark() : await runImport();

      if (result.status === 'cancelled') {
        return;
      }

      if (result.status === 'success') {
        await loadCustomers();
        setCustomerSearch('');
        setHasNewDataAvailable(false);
        Toast.success(result.message);
      } else {
        Toast.error(result.message);
      }
    } catch (error) {
      Toast.error(String(error));
    }
  };

  const handleCustomerSelect = async (customer: (typeof customers)[number]) => {
    onStartPress(customer.name);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.settingsButton} onPress={onSettingsPress}>
          <Ionicons name="settings-outline" size={theme.iconSize.large} color={colors.primary} />
          {hasNewDataAvailable && (
            <View
              style={[
                styles.newDataBadge,
                {
                  backgroundColor: colors.error,
                  borderColor: colors.background,
                },
              ]}
            />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <BeaverLogo size={150} />
        <Text style={[styles.title, { color: colors.text }]}>{t.startScreen.selectCustomer}</Text>
        {hasNewDataAvailable && (
          <TouchableOpacity onPress={handleImportCustomers} activeOpacity={0.7}>
            <Text style={[styles.reloadLinkText, { color: colors.primary }]}>
              {t.startScreen.newDataAvailableReload}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.customerSection}>
        {customers.length === 0 ? (
          <EmptyCustomersView colors={colors} t={t} onImport={handleImportCustomers} />
        ) : (
          <CustomerListView
            colors={colors}
            t={t}
            customerSearch={customerSearch}
            setCustomerSearch={setCustomerSearch}
            filteredCustomers={filteredCustomers}
            onSelect={handleCustomerSelect}
          />
        )}
      </View>

      <ImportProgressModal visible={importProgress.visible} message={importProgress.message} />
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
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  settingsButton: {
    padding: theme.spacing.sm,
    position: 'relative',
  },
  newDataBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 10,
    height: 10,
    borderRadius: theme.radius.round,
    borderWidth: 1.5,
  },
  content: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: theme.spacing.xl,
  },
  title: {
    ...theme.typography.h2,
    marginTop: theme.spacing.xl,
  },
  reloadLinkText: {
    ...theme.typography.bodyMedium,
    marginTop: theme.spacing.md,
    textDecorationLine: 'underline',
    textAlign: 'center',
  },
  customerSection: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },
  customerScrollView: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
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
  noResultsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResultsText: {
    ...theme.typography.body,
  },
  customerScrollContent: {
    paddingBottom: theme.spacing.xl,
  },
  customerCard: {
    borderRadius: theme.radius.medium,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  customerCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  customerCardText: {
    ...theme.typography.bodyMedium,
    marginLeft: theme.spacing.md,
  },
  emptyCustomerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: theme.spacing.xl,
    borderRadius: theme.radius.medium,
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  emptyCustomerText: {
    ...theme.typography.h5,
    marginTop: theme.spacing.lg,
  },
  emptyCustomerSubtext: {
    ...theme.typography.caption,
    marginTop: theme.spacing.sm,
    textAlign: 'center',
  },
});
