import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { DEFAULT_LANGUAGE } from '../constants';
import { translations, Translations } from '../localization';
import { Settings } from '../models/Settings';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState(DEFAULT_LANGUAGE);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    const settings = await Settings.load();
    if (settings.language && translations[settings.language]) {
      setLanguageState(settings.language);
    }
  };

  const setLanguage = useCallback(async (lang: string) => {
    const settings = await Settings.load();
    await settings.saveLanguage(lang);
    setLanguageState(lang);
  }, []);

  const t = translations[language] || translations.en;

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
