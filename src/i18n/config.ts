export const SUPPORTED_LOCALES = ["pl", "en"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "pl";
export const LOCALE_COOKIE_NAME = "gg_locale";
export const LOCALE_STORAGE_KEY = "gg_locale";

export function isLocale(value: string | null | undefined): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale);
}
