/**
 * Internationalization (i18n) Module
 *
 * Provides lightweight client-side translations for Bay Navigator.
 * Supports English (default) and Spanish initially.
 *
 * Usage:
 *   import { t, setLocale, getLocale } from '../i18n';
 *   const text = t('common.search'); // Returns translated string
 */

import en from './en.json';
import es from './es.json';

// Additional languages (zh-Hans, vi, tl, ko) are loaded dynamically
// to reduce bundle size - see loadLanguage()

export type Locale = 'en' | 'es' | 'zh-Hans' | 'vi' | 'tl' | 'ko';

export interface TranslationData {
  [key: string]: string | TranslationData;
}

const translations: Record<Locale, TranslationData | null> = {
  en: en as TranslationData,
  es: es as TranslationData,
  'zh-Hans': null, // Loaded dynamically
  vi: null, // Loaded dynamically
  tl: null, // Loaded dynamically
  ko: null, // Loaded dynamically
};

// Supported locales with display names
export const locales: Record<Locale, { name: string; nativeName: string }> = {
  en: { name: 'English', nativeName: 'English' },
  es: { name: 'Spanish', nativeName: 'Español' },
  'zh-Hans': { name: 'Chinese (Simplified)', nativeName: '简体中文' },
  vi: { name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  tl: { name: 'Tagalog', nativeName: 'Tagalog' },
  ko: { name: 'Korean', nativeName: '한국어' },
};

/**
 * Load a language file dynamically
 */
async function loadLanguage(locale: Locale): Promise<TranslationData | null> {
  if (translations[locale]) return translations[locale];

  try {
    const response = await fetch(`/i18n/${locale}.json`);
    if (response.ok) {
      const data = await response.json();
      translations[locale] = data as TranslationData;
      return data as TranslationData;
    }
  } catch (e) {
    console.warn(`Failed to load language: ${locale}`);
  }
  return null;
}

const STORAGE_KEY = 'baynavigator_locale';
const DEFAULT_LOCALE: Locale = 'en';

/**
 * Get current locale from storage or browser preference
 */
export function getLocale(): Locale {
  // Check localStorage first
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && isValidLocale(stored)) {
        return stored as Locale;
      }
    } catch {
      // localStorage not available
    }

    // Check browser language preference
    const browserLang = navigator.language?.split('-')[0];
    if (browserLang && isValidLocale(browserLang)) {
      return browserLang as Locale;
    }
  }

  return DEFAULT_LOCALE;
}

/**
 * Set locale and persist to storage
 * Loads language file dynamically if needed
 */
export async function setLocale(locale: Locale): Promise<void> {
  if (!isValidLocale(locale)) {
    console.warn(`Invalid locale: ${locale}, falling back to ${DEFAULT_LOCALE}`);
    locale = DEFAULT_LOCALE;
  }

  // Load language file if not already loaded
  if (!translations[locale]) {
    await loadLanguage(locale);
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // localStorage not available
    }

    // Update HTML lang attribute (use base language code for lang attribute)
    const langCode = locale.split('-')[0];
    document.documentElement.lang = langCode;

    // Dispatch event for components to react
    window.dispatchEvent(new CustomEvent('locale-changed', { detail: { locale } }));
  }
}

/**
 * Check if a locale string is valid
 */
export function isValidLocale(locale: string): locale is Locale {
  return locale in translations;
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: TranslationData, path: string): string | undefined {
  const keys = path.split('.');
  let current: TranslationData | string = obj;

  for (const key of keys) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    current = current[key] as TranslationData | string;
    if (current === undefined) {
      return undefined;
    }
  }

  return typeof current === 'string' ? current : undefined;
}

/**
 * Translate a key to the current locale
 *
 * @param key - Dot-notation key (e.g., 'common.search')
 * @param params - Optional parameters for interpolation (e.g., { count: 5 })
 * @param locale - Optional locale override
 * @returns Translated string or the key if not found
 */
export function t(key: string, params?: Record<string, string | number>, locale?: Locale): string {
  const currentLocale = locale || getLocale();
  const localeData = translations[currentLocale];

  // Try current locale first (if loaded)
  if (localeData) {
    const translation = getNestedValue(localeData, key);
    if (translation !== undefined) {
      return interpolate(translation, params);
    }
  }

  // Fallback to English
  const fallback = getNestedValue(translations.en!, key);
  if (fallback === undefined) {
    console.warn(`Translation missing for key: ${key}`);
    return key;
  }
  return interpolate(fallback, params);
}

/**
 * Interpolate parameters into a string
 * Supports {param} syntax
 */
function interpolate(str: string, params?: Record<string, string | number>): string {
  if (!params) return str;

  return str.replace(/\{(\w+)\}/g, (match, key) => {
    return params[key] !== undefined ? String(params[key]) : match;
  });
}

/**
 * Get all translations for a namespace
 */
export function getNamespace(namespace: string, locale?: Locale): Record<string, string> {
  const currentLocale = locale || getLocale();
  const localeData = translations[currentLocale];

  // Try current locale first
  if (localeData) {
    const data = getNestedValue(localeData, namespace);
    if (typeof data === 'object' && data !== null) {
      const result: Record<string, string> = {};
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string') {
          result[key] = value;
        }
      }
      return result;
    }
  }

  // Fallback to English
  const enData = getNestedValue(translations.en!, namespace);
  if (typeof enData === 'object' && enData !== null) {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(enData)) {
      if (typeof value === 'string') {
        result[key] = value;
      }
    }
    return result;
  }

  return {};
}

/**
 * Initialize i18n on page load
 * Sets HTML lang attribute based on saved/detected locale
 */
export function initI18n(): void {
  if (typeof window !== 'undefined') {
    const locale = getLocale();
    document.documentElement.lang = locale;
  }
}
