import { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { theme } from '../constants/theme';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { Customer, CustomerGroupWithCustomers } from '../database/schema';

interface CustomerGroupDialogProps {
  visible: boolean;
  group: CustomerGroupWithCustomers | null;
  savedTodayNames?: Set<string>;
  sentTodayNames?: Set<string>;
  onSelect: (customer: Customer) => void;
  onClose: () => void;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export function CustomerGroupDialog({
  visible,
  group,
  savedTodayNames,
  sentTodayNames,
  onSelect,
  onClose,
}: CustomerGroupDialogProps) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const [search, setSearch] = useState('');

  const handleClose = () => {
    setSearch('');
    onClose();
  };

  const handleSelect = (customer: Customer) => {
    setSearch('');
    onSelect(customer);
  };

  if (!group) return null;

  const searchTerm = search.toLowerCase().trim();
  const filtered = searchTerm
    ? group.customers.filter((c) => c.name.toLowerCase().includes(searchTerm))
    : group.customers;

  // Sort: unsaved customers first (original order), saved-today customers at bottom
  const filteredCustomers = savedTodayNames
    ? [
        ...filtered.filter((c) => !savedTodayNames.has(c.name)),
        ...filtered.filter((c) => savedTodayNames.has(c.name)),
      ]
    : filtered;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.dialog,
                { backgroundColor: colors.surface, maxHeight: SCREEN_HEIGHT * 0.75 },
              ]}
            >
              <View style={styles.dialogHeader}>
                <Text style={[styles.dialogTitle, { color: colors.text }]}>{group.name}</Text>
                <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                  <Ionicons name="close" size={theme.iconSize.large} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              {group.customers.length > 5 && (
                <View
                  style={[
                    styles.searchContainer,
                    { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
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
                    placeholder={t.savedOrders.searchCustomers}
                    value={search}
                    onChangeText={setSearch}
                    placeholderTextColor={colors.textTertiary}
                  />
                  {search.length > 0 && (
                    <TouchableOpacity onPress={() => setSearch('')} style={styles.clearButton}>
                      <Ionicons
                        name="close-circle"
                        size={theme.iconSize.small}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <ScrollView
                style={styles.customerList}
                contentContainerStyle={styles.customerListContent}
                showsVerticalScrollIndicator
              >
                {filteredCustomers.length === 0 ? (
                  <View style={styles.emptyContainer}>
                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                      {t.savedOrders.noCustomersInGroup}
                    </Text>
                  </View>
                ) : (
                  filteredCustomers.map((customer) => {
                    const isSavedToday = savedTodayNames?.has(customer.name) ?? false;
                    const isSentToday = sentTodayNames?.has(customer.name) ?? false;
                    const iconName = isSentToday
                      ? 'checkmark-done-circle'
                      : isSavedToday
                        ? 'checkmark-circle'
                        : 'person-outline';
                    const iconColor = isSentToday
                      ? colors.success
                      : isSavedToday
                        ? colors.warning
                        : colors.primary;
                    return (
                      <TouchableOpacity
                        key={customer.id}
                        style={[
                          styles.customerRow,
                          { borderBottomColor: colors.borderLight },
                          isSavedToday && { opacity: 0.6 },
                        ]}
                        activeOpacity={0.7}
                        onPress={() => handleSelect(customer)}
                      >
                        <View style={styles.customerRowContent}>
                          <Ionicons
                            name={iconName}
                            size={theme.iconSize.medium}
                            color={iconColor}
                          />
                          <Text style={[styles.customerName, { color: colors.text }]}>
                            {customer.name}
                          </Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={theme.iconSize.medium}
                          color={colors.textTertiary}
                        />
                      </TouchableOpacity>
                    );
                  })
                )}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: theme.spacing.xl,
  },
  dialog: {
    width: '100%',
    borderRadius: theme.radius.large,
    overflow: 'hidden',
    ...theme.elevation.highest,
  },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  dialogTitle: {
    ...theme.typography.h3,
    flex: 1,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.medium,
    borderWidth: 1,
    minHeight: 42,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...theme.typography.bodySmall,
  },
  clearButton: {
    width: 28,
    height: 28,
    borderRadius: theme.radius.round,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customerList: {
    flexShrink: 1,
  },
  customerListContent: {
    paddingBottom: theme.spacing.lg,
  },
  emptyContainer: {
    padding: theme.spacing.xxl,
    alignItems: 'center',
  },
  emptyText: {
    ...theme.typography.body,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  customerRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  customerName: {
    ...theme.typography.bodyMedium,
    marginLeft: theme.spacing.md,
  },
});
