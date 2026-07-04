// Hook + provider for locale switching, integrated with React.
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Locale, Dict } from './index';
import { DEFAULT_LOCALE, detectLocale, loadLocale, setStoredLocale } from './index';

interface I18nContextValue {
  locale: Locale;
  t: Dict;
  ready: boolean;
  setLocale: (l: Locale) => Promise<void>;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}

export function I18nProvider({ children, initialLocale }: { children: React.ReactNode; initialLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(() => initialLocale ?? detectLocale());
  const [dict, setDict] = useState<Dict | null>(null);

  // Load initial dictionary
  useEffect(() => {
    let cancelled = false;
    loadLocale(locale).then((d) => {
      if (!cancelled) setDict(d);
    });
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const setLocale = useCallback(async (l: Locale) => {
    setStoredLocale(l);
    setLocaleState(l);
    const d = await loadLocale(l);
    setDict(d);
    // Update <html lang> for accessibility/SEO
    if (typeof document !== 'undefined') document.documentElement.lang = l;
  }, []);

  if (!dict) return null; // tiny initial flash
  return (
    <I18nContext.Provider value={{ locale, t: dict, ready: true, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}
