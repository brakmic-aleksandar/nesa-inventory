import { useCallback, useRef } from 'react';
import { Alert, AppState, Linking } from 'react-native';
import Constants from 'expo-constants';
import { useFocusEffect } from 'expo-router';

import { useLanguage } from '../contexts/LanguageContext';

const GITHUB_OWNER = 'brakmic-aleksandar';
const GITHUB_REPO = 'nesa-inventory';
const UPDATE_PAGE_URL = `https://${GITHUB_OWNER}.github.io/${GITHUB_REPO}/`;

function parseVersion(tag: string): number[] {
  return tag.replace(/^v/i, '').split('.').map(Number);
}

function isNewerVersion(current: string, remote: string): boolean {
  const c = parseVersion(current);
  const r = parseVersion(remote);
  const len = Math.max(c.length, r.length);
  for (let i = 0; i < len; i++) {
    const cv = c[i] || 0;
    const rv = r[i] || 0;
    if (rv > cv) return true;
    if (rv < cv) return false;
  }
  return false;
}

async function checkForUpdate(t: ReturnType<typeof useLanguage>['t']) {
  const currentVersion = Constants.expoConfig?.version;
  if (!currentVersion) return;

  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
      { headers: { Accept: 'application/vnd.github+json' } }
    );
    if (!response.ok) return;

    const release = await response.json();
    const remoteVersion = release.tag_name;
    if (!remoteVersion) return;

    if (isNewerVersion(currentVersion, remoteVersion)) {
      const displayVersion = remoteVersion.replace(/^v/i, '');
      Alert.alert(
        t.updateCheck.title,
        t.updateCheck.message.replace('{version}', displayVersion),
        [
          { text: t.updateCheck.later, style: 'cancel' },
          {
            text: t.updateCheck.update,
            onPress: () => Linking.openURL(UPDATE_PAGE_URL),
          },
        ]
      );
    }
  } catch {
    // Silent fail — not critical
  }
}

export function useUpdateCheck() {
  const { t } = useLanguage();
  const tRef = useRef(t);
  tRef.current = t;

  useFocusEffect(
    useCallback(() => {
      // Check immediately when start screen is focused
      checkForUpdate(tRef.current);

      // Check again when app returns to foreground while on start screen
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') {
          checkForUpdate(tRef.current);
        }
      });

      return () => subscription.remove();
    }, [])
  );
}
