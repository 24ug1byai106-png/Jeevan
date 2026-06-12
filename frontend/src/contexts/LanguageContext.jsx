import React, { createContext, useState, useContext, useEffect } from 'react';
import { translations } from '../locales/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  // Try to get saved language from localStorage, default to English
  const [appLanguage, setAppLanguage] = useState(() => {
    const savedLang = localStorage.getItem('jeevan_app_language');
    return savedLang || 'English';
  });

  // Update localStorage when language changes
  useEffect(() => {
    localStorage.setItem('jeevan_app_language', appLanguage);
  }, [appLanguage]);

  // Translation function
  const t = (key) => {
    // If the translation for the current language exists, return it
    if (translations[appLanguage] && translations[appLanguage][key]) {
      return translations[appLanguage][key];
    }
    // Fallback to English if key doesn't exist in the selected language
    if (translations['English'] && translations['English'][key]) {
      return translations['English'][key];
    }
    // If all else fails, return the key itself
    return key;
  };

  return (
    <LanguageContext.Provider value={{ appLanguage, setAppLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Custom hook to use the language context
export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
