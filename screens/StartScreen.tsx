import { useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, View, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { BeaverLogo } from '../components/BeaverLogo';
import { CustomerGroupDialog } from '../components/CustomerGroupDialog';
import { CustomerPickerModal } from '../components/CustomerPickerModal';
import { ImportProgressModal } from '../components/ImportProgressModal';
import { Toast } from '../components/Toast';
import { theme } from '../constants/theme';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { db } from '../database/DatabaseService';
import { Customer, CustomerGroupWithCustomers } from '../database/schema';
import { useCustomers } from '../hooks/useCustomers';
import { useImportData } from '../hooks/useImportData';

interface StartScreenProps {
  onStartPress: (text: string) => void;
  onEditExistingOrder: (orderId: number) => void;
  onSettingsPress: () => void;
  onSavedOrdersPress: () => void;
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
    <TouchableOpacity style={styles.emptyCustomerState} onPress={onImport} activeOpacity={0.7}>
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

function GroupListView({
  colors,
  t,
  customerSearch,
  setCustomerSearch,
  filteredGroups,
  onGroupPress,
  onCustomCustomer,
}: {
  colors: ReturnType<typeof useTheme>['colors'];
  t: ReturnType<typeof useLanguage>['t'];
  customerSearch: string;
  setCustomerSearch: (value: string) => void;
  filteredGroups: CustomerGroupWithCustomers[];
  onGroupPress: (group: CustomerGroupWithCustomers) => void;
  onCustomCustomer: () => void;
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

      {filteredGroups.length === 0 ? (
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
          {filteredGroups.map((group) => (
            <TouchableOpacity
              key={group.id}
              style={[
                styles.groupCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  ...theme.elevation.low,
                },
              ]}
              activeOpacity={0.7}
              onPress={() => onGroupPress(group)}
            >
              <View style={styles.groupCardContent}>
                <Ionicons
                  name="people-outline"
                  size={theme.iconSize.medium}
                  color={colors.primary}
                />
                <View style={styles.groupCardTextContainer}>
                  <Text style={[styles.groupCardName, { color: colors.text }]}>
                    {group.name}
                  </Text>
                  <Text style={[styles.groupCardCount, { color: colors.textSecondary }]}>
                    {t.startScreen.customersCount.replace('{count}', String(group.customers.length))}
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={theme.iconSize.medium}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.customCustomerLink}
            activeOpacity={0.7}
            onPress={onCustomCustomer}
          >
            <Ionicons name="pencil-outline" size={theme.iconSize.small} color={colors.textTertiary} />
            <Text style={[styles.customCustomerLinkText, { color: colors.textTertiary }]}>
              {t.startScreen.customCustomer}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </>
  );
}

export default function StartScreen({
  onStartPress,
  onEditExistingOrder,
  onSettingsPress,
  onSavedOrdersPress,
  refreshKey,
}: StartScreenProps) {
  const { t } = useLanguage();
  const { colors, isDark } = useTheme();
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<CustomerGroupWithCustomers | null>(null);
  const [customPickerVisible, setCustomPickerVisible] = useState(false);
  const [savedOrdersCount, setSavedOrdersCount] = useState(0);
  const [savedTodayNames, setSavedTodayNames] = useState<Set<string>>(new Set());
  const [sentTodayNames, setSentTodayNames] = useState<Set<string>>(new Set());
  const {
    customerGroups,
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
      db.getSavedOrdersCount().then(setSavedOrdersCount).catch(() => {});
      db.getTodayCustomerNames().then(setSavedTodayNames).catch(() => {});
      db.getTodaySentCustomerNames().then(setSentTodayNames).catch(() => {});

      const interval = setInterval(() => {
        refreshStatusAndCustomers();
      }, 30000);

      return () => clearInterval(interval);
    }, [refreshStatusAndCustomers])
  );

  const searchTerm = customerSearch.toLowerCase().trim();
  const totalCustomersCount = customerGroups.reduce(
    (sum, group) => sum + group.customers.length,
    0
  );
  const filteredGroups = customerGroups
    .map((group) => ({
      ...group,
      customers: group.name.toLowerCase().includes(searchTerm)
        ? group.customers
        : group.customers.filter((customer) => customer.name.toLowerCase().includes(searchTerm)),
    }))
    .filter((group) => group.customers.length > 0);

  const handleGroupPress = useCallback((group: CustomerGroupWithCustomers) => {
    setSelectedGroup(group);
  }, []);

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

  const handleCustomCustomer = () => {
    setCustomPickerVisible(true);
  };

  const handleCustomPickerSelect = (name: string) => {
    setCustomPickerVisible(false);
    onStartPress(name);
  };

  const handleCustomerSelect = async (customer: Customer) => {
    setSelectedGroup(null);

    if (savedTodayNames.has(customer.name)) {
      const existingOrder = await db.getTodayOrderForCustomer(customer.name);
      if (existingOrder) {
        Alert.alert(
          t.startScreen.existingOrderTitle,
          t.startScreen.existingOrderMessage.replace('{customer}', customer.name),
          [
            {
              text: t.savedOrders.cancel,
              style: 'cancel',
            },
            {
              text: t.startScreen.editExisting,
              onPress: () => onEditExistingOrder(existingOrder.id),
            },
            {
              text: t.startScreen.createNew,
              onPress: () => onStartPress(customer.name),
            },
          ],
          { cancelable: true }
        );
        return;
      }
    }

    onStartPress(customer.name);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar style={isDark ? 'light' : 'dark'} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={onSavedOrdersPress}>
          <Ionicons name="document-text-outline" size={theme.iconSize.large} color={colors.primary} />
          {savedOrdersCount > 0 && (
            <View
              style={[
                styles.savedOrdersBadge,
                { backgroundColor: colors.primary },
              ]}
            >
              <Text style={styles.savedOrdersBadgeText}>{savedOrdersCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerButton} onPress={onSettingsPress}>
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
        {totalCustomersCount === 0 ? (
          <EmptyCustomersView colors={colors} t={t} onImport={handleImportCustomers} />
        ) : (
          <GroupListView
            colors={colors}
            t={t}
            customerSearch={customerSearch}
            setCustomerSearch={setCustomerSearch}
            filteredGroups={filteredGroups}
            onGroupPress={handleGroupPress}
            onCustomCustomer={handleCustomCustomer}
          />
        )}
      </View>

      <CustomerGroupDialog
        visible={selectedGroup !== null}
        group={selectedGroup}
        savedTodayNames={savedTodayNames}
        sentTodayNames={sentTodayNames}
        onSelect={handleCustomerSelect}
        onClose={() => setSelectedGroup(null)}
      />

      <CustomerPickerModal
        visible={customPickerVisible}
        currentName=""
        onSelect={handleCustomPickerSelect}
        onClose={() => setCustomPickerVisible(false)}
        showCustomerList={false}
      />

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
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
  },
  headerButton: {
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
  savedOrdersBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: theme.radius.round,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  savedOrdersBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
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
  groupCard: {
    borderRadius: theme.radius.medium,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
  },
  groupCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  groupCardTextContainer: {
    marginLeft: theme.spacing.md,
    flex: 1,
  },
  groupCardName: {
    ...theme.typography.bodyMedium,
    fontWeight: '600',
  },
  groupCardCount: {
    ...theme.typography.caption,
    marginTop: 2,
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
  customCustomerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  customCustomerLinkText: {
    ...theme.typography.caption,
  },
});
