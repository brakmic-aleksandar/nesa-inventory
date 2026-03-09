import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations, Translations } from '../localization';
import { Settings } from '../models/Settings';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState('es');

  useEffect(() => {
    // Load saved language preference
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    const settings = await Settings.load();
    if (settings.language && translations[settings.language]) {
      setLanguageState(settings.language);
    }
  };

  const setLanguage = async (lang: string) => {
    const settings = await Settings.load();
    await settings.saveLanguage(lang);
    setLanguageState(lang);
  };

  const t = translations[language] || translations.en;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
