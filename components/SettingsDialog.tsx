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

import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { languages } from '../localization';
import { Settings } from '../models/Settings';
import { excelImport } from '../services/ExcelImportService';
import { useImportData } from '../hooks/useImportData';
import { ImportProgressModal } from './ImportProgressModal';
import { Toast } from './Toast';

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
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
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
              <>
                <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    {t.settings.title}
                  </Text>
                  <Pressable onPress={closeWithSave}>
                    <Ionicons name="close" size={28} color={colors.textSecondary} />
                  </Pressable>
                </View>

                <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
                  <View style={[styles.settingsSection, { borderBottomColor: colors.border }]}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      {t.settings.language}
                    </Text>
                    <View style={styles.languageContainer}>
                      {languages.map((lang) => (
                        <Pressable
                          key={lang.code}
                          style={[
                            styles.languageButton,
                            {
                              backgroundColor: isDark ? '#1C1C1E' : '#f0f0f0',
                              borderColor: language === lang.code ? '#007AFF' : 'transparent',
                            },
                            language === lang.code && styles.languageButtonActive,
                          ]}
                          onPress={() => setLanguage(lang.code)}
                        >
                          <Text
                            style={[
                              styles.languageButtonText,
                              { color: language === lang.code ? '#007AFF' : colors.textSecondary },
                              language === lang.code && styles.languageButtonTextActive,
                            ]}
                          >
                            {lang.name}
                          </Text>
                        </Pressable>
                      ))}
                    </View>

                    <View style={styles.settingRow}>
                      <View style={styles.settingLabelContainer}>
                        <Ionicons name={isDark ? 'moon' : 'sunny'} size={20} color="#007AFF" />
                        <Text style={[styles.settingLabel, { color: colors.text }]}>
                          {t.settings.darkMode}
                        </Text>
                      </View>
                      <Switch
                        value={isDark}
                        onValueChange={toggleColorScheme}
                        trackColor={{ false: '#d1d1d6', true: '#34C759' }}
                        thumbColor="#fff"
                      />
                    </View>

                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      {t.settings.email}
                    </Text>
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

                    <Pressable style={styles.importButton} onPress={handleImportData}>
                      <Ionicons name="cloud-download-outline" size={24} color="#fff" />
                      <Text style={styles.importButtonText}>{t.settings.importData}</Text>
                    </Pressable>

                    <Pressable style={styles.exportButton} onPress={handleGenerateExamples}>
                      <Ionicons name="document-text-outline" size={24} color="#fff" />
                      <Text style={styles.exportButtonText}>{t.settings.exportExamples}</Text>
                    </Pressable>
                  </View>
                </ScrollView>

                <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
                  <Pressable style={styles.closeButton} onPress={closeWithSave}>
                    <Text style={styles.closeButtonText}>{t.settings.close}</Text>
                  </Pressable>
                </View>
              </>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  keyboardAvoidingContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '65%',
    minHeight: '55%',
    maxHeight: '95%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '600',
  },
  modalBody: {
    flex: 1,
  },
  settingsSection: {
    padding: 20,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
    marginTop: 10,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  settingLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingsInput: {
    height: 50,
    borderRadius: 8,
    paddingHorizontal: 15,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    height: 50,
    borderRadius: 10,
    gap: 10,
    marginTop: 10,
  },
  importButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF9500',
    height: 50,
    borderRadius: 10,
    gap: 10,
    marginTop: 10,
  },
  exportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
  },
  closeButton: {
    backgroundColor: '#007AFF',
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  languageContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 15,
  },
  languageButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  languageButtonActive: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007AFF',
  },
  languageButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  languageButtonTextActive: {
    color: '#007AFF',
  },
});
