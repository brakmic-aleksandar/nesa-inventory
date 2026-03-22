import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';

import { theme } from '../constants/theme';
import { ImportProgressModal } from './ImportProgressModal';
import { Toast } from './Toast';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { useImportData } from '../hooks/useImportData';
import { languages } from '../localization';
import { Settings } from '../models/Settings';
import { excelImport } from '../services/ExcelImportService';

interface SettingsFormColors {
  text: string;
  textSecondary: string;
  textTertiary: string;
  textOnColor: string;
  border: string;
  surface: string;
  surfaceSecondary: string;
  primary: string;
  primaryLight: string;
  success: string;
  warning: string;
  switchTrackOff: string;
}

function SettingsForm({
  colors,
  t,
  language,
  isDark,
  destinationEmail,
  setLanguage,
  toggleColorScheme,
  setDestinationEmail,
  onImport,
  onGenerateExamples,
  onClose,
}: {
  colors: SettingsFormColors;
  t: ReturnType<typeof useLanguage>['t'];
  language: string;
  isDark: boolean;
  destinationEmail: string;
  setLanguage: (code: string) => void;
  toggleColorScheme: () => void;
  setDestinationEmail: (value: string) => void;
  onImport: () => void;
  onGenerateExamples: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
        <Text style={[styles.modalTitle, { color: colors.text }]}>{t.settings.title}</Text>
        <Pressable onPress={onClose}>
          <Ionicons name="close" size={28} color={colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
        <View style={[styles.settingsSection, { borderBottomColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.settings.language}</Text>
          <View style={styles.languageContainer}>
            {languages.map((lang) => (
              <Pressable
                key={lang.code}
                style={[
                  styles.languageButton,
                  {
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: language === lang.code ? colors.primary : 'transparent',
                  },
                  language === lang.code && {
                    backgroundColor: colors.primaryLight,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={() => setLanguage(lang.code)}
              >
                <Text
                  style={[
                    styles.languageButtonText,
                    {
                      color: language === lang.code ? colors.primary : colors.textSecondary,
                    },
                  ]}
                >
                  {lang.name}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLabelContainer}>
              <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color={colors.primary} />
              <Text style={[styles.settingLabel, { color: colors.text }]}>
                {t.settings.darkMode}
              </Text>
            </View>
            <Switch
              value={isDark}
              onValueChange={toggleColorScheme}
              trackColor={{ false: colors.switchTrackOff, true: colors.success }}
              thumbColor={colors.textOnColor}
            />
          </View>

          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t.settings.email}</Text>
          <TextInput
            style={[
              styles.settingsInput,
              {
                backgroundColor: colors.surfaceSecondary,
                borderColor: colors.border,
                color: colors.text,
              },
            ]}
            placeholder={t.settings.emailPlaceholder}
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            value={destinationEmail}
            onChangeText={setDestinationEmail}
          />

          <Pressable
            style={[styles.importButton, { backgroundColor: colors.success }]}
            onPress={onImport}
          >
            <Ionicons name="cloud-download-outline" size={24} color={colors.textOnColor} />
            <Text style={[styles.importButtonText, { color: colors.textOnColor }]}>
              {t.settings.importData}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.exportButton, { backgroundColor: colors.warning }]}
            onPress={onGenerateExamples}
          >
            <Ionicons name="document-text-outline" size={24} color={colors.textOnColor} />
            <Text style={[styles.exportButtonText, { color: colors.textOnColor }]}>
              {t.settings.exportExamples}
            </Text>
          </Pressable>
        </View>

        <Text style={[styles.versionText, { color: colors.textTertiary }]}>
          v{Constants.expoConfig?.version ?? '?'}
        </Text>
      </ScrollView>

      <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
        <Pressable
          style={[styles.closeButton, { backgroundColor: colors.primary }]}
          onPress={onClose}
        >
          <Text style={[styles.closeButtonText, { color: colors.textOnColor }]}>
            {t.settings.close}
          </Text>
        </Pressable>
      </View>
    </>
  );
}

interface SettingsDialogProps {
  onClose: (hasImportedData: boolean) => void | Promise<void>;
}

export function SettingsDialog({ onClose }: SettingsDialogProps) {
  const { t, language, setLanguage } = useLanguage();
  const { toggleColorScheme, colors, isDark } = useTheme();
  const { importProgress, runImport, shareFile } = useImportData();
  const [destinationEmail, setDestinationEmail] = useState('');
  const [hasImportedData, setHasImportedData] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(48)).current;

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await Settings.load();
      setDestinationEmail(settings.destinationEmail || '');
    };

    loadSettings();

    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 0,
        duration: 320,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [backdropOpacity, sheetTranslateY]);

  const closeWithSave = async () => {
    if (isClosing) {
      return;
    }

    setIsClosing(true);
    try {
      const settings = new Settings(language, destinationEmail.trim());
      await settings.save();
      await onClose(hasImportedData);
    } finally {
      setIsClosing(false);
    }
  };

  const handleImportData = async () => {
    try {
      Alert.alert(t.settings.importDataTitle, t.settings.importDataMessage, [
        {
          text: t.settings.cancel,
          style: 'cancel',
        },
        {
          text: t.settings.selectFile,
          onPress: async () => {
            try {
              const result = await runImport();

              if (result.status === 'cancelled') {
                return;
              }

              if (result.status === 'success') {
                setHasImportedData(true);
                Toast.success(result.message);
              } else {
                Toast.error(result.message);
              }
            } catch (error) {
              console.error('Import execution error:', error);
              Toast.error(t.settings.failedToImport);
            }
          },
        },
      ]);
    } catch (error) {
      console.error('Import error:', error);
      Toast.error(t.settings.failedToImport);
    }
  };

  const handleGenerateExamples = async () => {
    try {
      Alert.alert(t.settings.generateExampleTitle, t.settings.generateExampleMessage, [
        {
          text: t.settings.cancel,
          style: 'cancel',
        },
        {
          text: t.settings.generate,
          onPress: async () => {
            const templateResult = await excelImport.generateExampleFiles(language);
            if (templateResult.success && templateResult.files) {
              Alert.alert(t.settings.templateGenerated, t.settings.templateCreatedMessage, [
                {
                  text: t.settings.shareTemplate,
                  onPress: async () => {
                    try {
                      await shareFile(templateResult.files!.template);
                    } catch {
                      Alert.alert(t.settings.error, t.settings.failedToShare);
                    }
                  },
                },
                {
                  text: t.settings.done,
                  style: 'cancel',
                },
              ]);
            } else {
              Alert.alert(t.settings.error, templateResult.message);
            }
          },
        },
      ]);
    } catch (error) {
      console.error('Generate examples error:', error);
      Alert.alert(t.settings.error, t.settings.failedToGenerate);
    }
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={importProgress.visible ? undefined : closeWithSave}
    >
      <View style={styles.root}>
        <Animated.View
          style={[styles.backdrop, { backgroundColor: colors.overlay, opacity: backdropOpacity }]}
        >
          {!importProgress.visible ? (
            <Pressable style={StyleSheet.absoluteFill} onPress={closeWithSave} />
          ) : null}
        </Animated.View>

        {importProgress.visible ? (
          <ImportProgressModal
            visible={importProgress.visible}
            message={importProgress.message}
            useModal={false}
          />
        ) : (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
            style={styles.keyboardAvoidingContainer}
          >
            <Animated.View
              style={[
                styles.sheet,
                {
                  backgroundColor: colors.cardBackground,
                  transform: [{ translateY: sheetTranslateY }],
                },
              ]}
            >
              <SettingsForm
                colors={colors}
                t={t}
                language={language}
                isDark={isDark}
                destinationEmail={destinationEmail}
                setLanguage={setLanguage}
                toggleColorScheme={toggleColorScheme}
                setDestinationEmail={setDestinationEmail}
                onImport={handleImportData}
                onGenerateExamples={handleGenerateExamples}
                onClose={closeWithSave}
              />
            </Animated.View>
          </KeyboardAvoidingView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  keyboardAvoidingContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: theme.radius.xlarge,
    borderTopRightRadius: theme.radius.xlarge,
    height: '65%',
    minHeight: '55%',
    maxHeight: '95%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: theme.spacing.xl,
    borderBottomWidth: 1,
  },
  modalTitle: {
    ...theme.typography.h2,
    fontSize: 22,
  },
  modalBody: {
    flex: 1,
  },
  settingsSection: {
    padding: theme.spacing.xl,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    ...theme.typography.h4,
    marginBottom: 15,
    marginTop: 10,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingLabel: {
    ...theme.typography.body,
    fontWeight: '500',
  },
  settingsInput: {
    height: 50,
    borderRadius: theme.radius.small,
    paddingHorizontal: 15,
    ...theme.typography.body,
    borderWidth: 1,
    marginBottom: theme.spacing.xl,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: theme.radius.medium,
    gap: 10,
    marginTop: 10,
  },
  importButtonText: {
    ...theme.typography.body,
    fontWeight: '600',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: theme.radius.medium,
    gap: 10,
    marginTop: 10,
  },
  exportButtonText: {
    ...theme.typography.body,
    fontWeight: '600',
  },
  modalFooter: {
    padding: theme.spacing.xl,
    borderTopWidth: 1,
  },
  closeButton: {
    height: 50,
    borderRadius: theme.radius.medium,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    ...theme.typography.h4,
  },
  languageContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  languageButton: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radius.small,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageButtonText: {
    ...theme.typography.bodySmall,
    fontWeight: '600',
  },
  versionText: {
    ...theme.typography.caption,
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: theme.spacing.md,
  },
});
