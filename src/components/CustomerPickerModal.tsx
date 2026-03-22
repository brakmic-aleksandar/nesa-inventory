import { useCallback, useEffect, useState } from 'react';
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { theme } from '../constants/theme';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { db } from '../database/DatabaseService';
import { CustomerGroupWithCustomers } from '../database/schema';

interface CustomerPickerModalProps {
  visible: boolean;
  currentName: string;
  onSelect: (name: string) => void;
  onClose: () => void;
  showCustomerList?: boolean;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export function CustomerPickerModal({
  visible,
  currentName,
  onSelect,
  onClose,
  showCustomerList = true,
}: CustomerPickerModalProps) {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const [customName, setCustomName] = useState(currentName);
  const [search, setSearch] = useState('');
  const [groups, setGroups] = useState<CustomerGroupWithCustomers[]>([]);

  useEffect(() => {
    let isMounted = true;
    if (visible) {
      setCustomName(currentName);
      setSearch('');
      db.getCustomerGroupsWithCustomers()
        .then((data) => {
          if (isMounted) setGroups(data);
        })
        .catch(() => {});
    }
    return () => {
      isMounted = false;
    };
  }, [visible, currentName]);

  const handleConfirmCustomName = useCallback(() => {
    const trimmed = customName.trim();
    if (trimmed) {
      onSelect(trimmed);
    }
  }, [customName, onSelect]);

  const handleSelectCustomer = useCallback(
    (name: string) => {
      onSelect(name);
    },
    [onSelect]
  );

  const searchTerm = search.toLowerCase().trim();
  const filteredGroups = groups
    .map((group) => ({
      ...group,
      customers: group.name.toLowerCase().includes(searchTerm)
        ? group.customers
        : group.customers.filter((c) => c.name.toLowerCase().includes(searchTerm)),
    }))
    .filter((group) => group.customers.length > 0);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.dialog,
                { backgroundColor: colors.surface, maxHeight: SCREEN_HEIGHT * 0.8 },
              ]}
            >
              {/* Header */}
              <View style={styles.dialogHeader}>
                <Text style={[styles.dialogTitle, { color: colors.text }]}>
                  {showCustomerList ? t.selectionScreen.editCustomerName : t.startScreen.enterCustomerName}
                </Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons
                    name="close"
                    size={theme.iconSize.large}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Custom name input */}
              <View style={styles.customNameSection}>
                <View
                  style={[
                    styles.customNameInput,
                    { backgroundColor: colors.surfaceSecondary, borderColor: colors.border },
                  ]}
                >
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    value={customName}
                    onChangeText={setCustomName}
                    placeholder={t.startScreen.customerNamePlaceholder}
                    placeholderTextColor={colors.textTertiary}
                    autoFocus
                    selectTextOnFocus
                    returnKeyType="done"
                    onSubmitEditing={handleConfirmCustomName}
                  />
                  <TouchableOpacity
                    style={[
                      styles.confirmButton,
                      { backgroundColor: colors.primary },
                      !customName.trim() && { opacity: 0.4 },
                    ]}
                    onPress={handleConfirmCustomName}
                    disabled={!customName.trim()}
                  >
                    <Ionicons
                      name="checkmark"
                      size={theme.iconSize.medium}
                      color={colors.textOnColor}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {showCustomerList && (
                <>
                  {/* Divider with "or select" label */}
                  <View style={styles.dividerRow}>
                    <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                    <Text style={[styles.dividerText, { color: colors.textSecondary }]}>
                      {t.startScreen.selectCustomer.toLowerCase()}
                    </Text>
                    <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                  </View>

                  {/* Search */}
                  {groups.reduce((sum, g) => sum + g.customers.length, 0) > 5 && (
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
                        placeholder={t.startScreen.searchCustomers}
                        value={search}
                        onChangeText={setSearch}
                        placeholderTextColor={colors.textTertiary}
                      />
                      {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')} style={styles.clearSearchButton}>
                          <Ionicons
                            name="close-circle"
                            size={theme.iconSize.small}
                            color={colors.textSecondary}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  )}

                  {/* Customer list */}
                  <ScrollView
                    style={styles.customerList}
                    contentContainerStyle={styles.customerListContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator
                  >
                    {filteredGroups.length === 0 ? (
                      <View style={styles.emptyContainer}>
                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                          {t.startScreen.noCustomersFound}
                        </Text>
                      </View>
                    ) : (
                      filteredGroups.map((group) => (
                        <View key={group.id}>
                          <Text style={[styles.groupLabel, { color: colors.textSecondary }]}>
                            {group.name}
                          </Text>
                          {group.customers.map((customer) => (
                            <TouchableOpacity
                              key={customer.id}
                              style={[styles.customerRow, { borderBottomColor: colors.borderLight }]}
                              activeOpacity={0.7}
                              onPress={() => handleSelectCustomer(customer.name)}
                            >
                              <Ionicons
                                name="person-outline"
                                size={theme.iconSize.medium}
                                color={colors.primary}
                              />
                              <Text style={[styles.customerName, { color: colors.text }]}>
                                {customer.name}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ))
                    )}
                  </ScrollView>
                </>
              )}
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
    paddingBottom: theme.spacing.sm,
  },
  dialogTitle: {
    ...theme.typography.h3,
    flex: 1,
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  customNameSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
  },
  customNameInput: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radius.medium,
    borderWidth: 1,
    overflow: 'hidden',
  },
  textInput: {
    flex: 1,
    ...theme.typography.body,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
  },
  confirmButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    ...theme.typography.caption,
    paddingHorizontal: theme.spacing.md,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
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
  clearSearchButton: {
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
  groupLabel: {
    ...theme.typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  customerName: {
    ...theme.typography.bodyMedium,
    marginLeft: theme.spacing.md,
  },
});
