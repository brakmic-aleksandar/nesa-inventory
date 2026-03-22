import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorBoundary } from '../components/ErrorBoundary';
import { ToastContainer } from '../components/Toast';
import { theme } from '../constants/theme';
import { LanguageProvider } from '../contexts/LanguageContext';
import { OrderProvider } from '../contexts/OrderContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { db } from '../database/DatabaseService';
import { translations } from '../localization';
import { Settings } from '../models/Settings';

function LoadingScreen({ text }: { text: string }) {
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={theme.light.primary} />
      <Text style={styles.loadingText}>{text}</Text>
    </View>
  );
}

function DbErrorScreen() {
  return (
    <View style={styles.loadingContainer}>
      <Text style={styles.errorText}>Failed to initialize database</Text>
    </View>
  );
}

export default function RootLayout() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [dbError, setDbError] = useState(false);
  const [loadingText, setLoadingText] = useState(translations.en.startScreen.loading);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const settings = await Settings.load();
        const language = settings.language;
        const localized = translations[language] || translations.en;
        setLoadingText(localized.startScreen.loading);

        await db.init();
        await db.deleteExpiredOrders();
        if (isMounted) {
          setIsDbReady(true);
        }
      } catch (error) {
        console.error('Failed to initialize database:', error);
        if (isMounted) {
          setDbError(true);
          setIsDbReady(true);
        }
      }
    };

    init();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!isDbReady) {
    return <LoadingScreen text={loadingText} />;
  }

  if (dbError) {
    return <DbErrorScreen />;
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider>
          <LanguageProvider>
            <OrderProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'slide_from_right',
                  gestureEnabled: true,
                }}
              >
                <Stack.Screen name="index" />
                <Stack.Screen name="selection" />
                <Stack.Screen name="shelf" />
                <Stack.Screen name="summary" />
                <Stack.Screen name="saved-orders" />
                <Stack.Screen
                  name="settings"
                  options={{
                    presentation: 'transparentModal',
                    animation: 'fade',
                    gestureEnabled: false,
                    contentStyle: { backgroundColor: 'transparent' },
                  }}
                />
                <Stack.Screen
                  name="stand-item-details"
                  options={{
                    presentation: 'transparentModal',
                    animation: 'fade',
                    gestureEnabled: false,
                    contentStyle: { backgroundColor: 'transparent' },
                  }}
                />
                <Stack.Screen
                  name="shelf-item-details"
                  options={{
                    presentation: 'transparentModal',
                    animation: 'fade',
                    gestureEnabled: false,
                    contentStyle: { backgroundColor: 'transparent' },
                  }}
                />
              </Stack>
              <ToastContainer />
            </OrderProvider>
          </LanguageProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.light.background,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: theme.light.textSecondary,
  },
  errorText: {
    fontSize: 16,
    color: theme.light.error,
    textAlign: 'center',
  },
});
