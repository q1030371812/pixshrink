// src/i18n/index.ts
// Lightweight i18n for Pixshrink. Zero runtime deps, locale persisted to localStorage.

export type Locale =
  | 'en' | 'zh' | 'ja' | 'ko' | 'es' | 'pt' | 'fr' | 'de' | 'it'
  | 'ru' | 'pl' | 'nl' | 'tr' | 'ar' | 'hi' | 'id' | 'vi' | 'th'
  | 'sv' | 'da' | 'no' | 'fi' | 'cs' | 'el' | 'he' | 'uk' | 'ro'
  | 'hu' | 'ca';

export const LOCALES: { code: Locale; native: string; english: string }[] = [
  { code: 'en', native: 'English', english: 'English' },
  { code: 'zh', native: '中文', english: 'Chinese' },
  { code: 'ja', native: '日本語', english: 'Japanese' },
  { code: 'ko', native: '한국어', english: 'Korean' },
  { code: 'es', native: 'Español', english: 'Spanish' },
  { code: 'pt', native: 'Português', english: 'Portuguese' },
  { code: 'fr', native: 'Français', english: 'French' },
  { code: 'de', native: 'Deutsch', english: 'German' },
  { code: 'it', native: 'Italiano', english: 'Italian' },
  { code: 'ru', native: 'Русский', english: 'Russian' },
  { code: 'pl', native: 'Polski', english: 'Polish' },
  { code: 'nl', native: 'Nederlands', english: 'Dutch' },
  { code: 'tr', native: 'Türkçe', english: 'Turkish' },
  { code: 'ar', native: 'العربية', english: 'Arabic' },
  { code: 'hi', native: 'हिन्दी', english: 'Hindi' },
  { code: 'id', native: 'Bahasa Indonesia', english: 'Indonesian' },
  { code: 'vi', native: 'Tiếng Việt', english: 'Vietnamese' },
  { code: 'th', native: 'ไทย', english: 'Thai' },
  { code: 'sv', native: 'Svenska', english: 'Swedish' },
  { code: 'da', native: 'Dansk', english: 'Danish' },
  { code: 'no', native: 'Norsk', english: 'Norwegian' },
  { code: 'fi', native: 'Suomi', english: 'Finnish' },
  { code: 'cs', native: 'Čeština', english: 'Czech' },
  { code: 'el', native: 'Ελληνικά', english: 'Greek' },
  { code: 'he', native: 'עברית', english: 'Hebrew' },
  { code: 'uk', native: 'Українська', english: 'Ukrainian' },
  { code: 'ro', native: 'Română', english: 'Romanian' },
  { code: 'hu', native: 'Magyar', english: 'Hungarian' },
  { code: 'ca', native: 'Català', english: 'Catalan' },
];

export const DEFAULT_LOCALE: Locale = 'en';

// Auto-detect from browser
export function detectLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;
  try {
    const stored = window.localStorage.getItem('pixshrink-locale') as Locale | null;
    if (stored && LOCALES.some((l) => l.code === stored)) return stored;
  } catch {}
  const nav = window.navigator?.language?.slice(0, 2).toLowerCase();
  if (nav && LOCALES.some((l) => l.code === nav)) return nav as Locale;
  return DEFAULT_LOCALE;
}

// Lazy load dictionaries per locale for tiny initial bundle
const cache = new Map<Locale, Dict>();

export async function loadLocale(locale: Locale): Promise<Dict> {
  if (cache.has(locale)) return cache.get(locale)!;
  const mod = await import(`./locales/${locale}.ts`);
  cache.set(locale, mod.default);
  return mod.default;
}

export function setStoredLocale(locale: Locale) {
  try {
    window.localStorage.setItem('pixshrink-locale', locale);
    document.documentElement.lang = locale;
  } catch {}
}

export type Dict = {
  appTitle: string;
  tagline: string;
  privacyBadge: string;
  heroTitle: string;
  heroSub: string;
  heroBullet1: string;
  heroBullet2: string;
  heroBullet3: string;
  ctaStart: string;
  dropzoneIdle: string;
  dropzoneActive: string;
  dropzoneHint: string;
  queueTitle: string;
  queueEmpty: string;
  queueCount: (n: number) => string;
  queueTotalSaved: string;
  qualityLabel: string;
  formatLabel: string;
  compressButton: string;
  compressAll: string;
  downloadAll: string;
  downloadZip: string;
  removeFile: string;
  featuresTitle: string;
  feat1Title: string;
  feat1Body: string;
  feat2Title: string;
  feat2Body: string;
  feat3Title: string;
  feat3Body: string;
  feat4Title: string;
  feat4Body: string;
  feat5Title: string;
  feat5Body: string;
  feat6Title: string;
  feat6Body: string;
  settingsTitle: string;
  themeLabel: string;
  themeLight: string;
  themeDark: string;
  languageLabel: string;
  footerTagline: string;
  aboutTitle?: string;
  aboutSub?: string;
  aboutP1?: string;
  aboutP2?: string;
  aboutStep1Title?: string;
  aboutStep1Body?: string;
  aboutStep2Title?: string;
  aboutStep2Body?: string;
  aboutStep3Title?: string;
  aboutStep3Body?: string;
  faqTitle?: string;
  faqSub?: string;
  footerPrivacyTagline?: string;
  formatBytes: (b: number) => string;
  formatPercent: (n: number) => string;
  savedPercent: (n: number) => string;
  localizingPromise: string;
  unsupportedFormat: (f: string) => string;
  fileTooLarge: (mb: number, max: number) => string;
};
