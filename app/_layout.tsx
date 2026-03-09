import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';

import { LanguageProvider } from '../contexts/LanguageContext';
import { OrderProvider } from '../contexts/OrderContext';
import { ThemeProvider } from '../contexts/ThemeContext';
import { ToastContainer } from '../components/Toast';
import { db } from '../database/DatabaseService';
import { Settings } from '../models/Settings';
import { translations } from '../localization';

export default function RootLayout() {
  const [isDbReady, setIsDbReady] = useState(false);
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
        if (isMounted) {
          setIsDbReady(true);
          console.log('Database initialized successfully');
        }
      } catch (error) {
        console.error('Failed to initialize database:', error);
        if (isMounted) {
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
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>{loadingText}</Text>
      </View>
    );
  }

  return (
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
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});
