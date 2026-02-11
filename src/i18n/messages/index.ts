import type { Locale } from "../config";
import { DEFAULT_LOCALE } from "../config";
import { enMessages } from "./en";
import { plMessages } from "./pl";

export const MESSAGES = {
  pl: plMessages,
  en: enMessages,
} as const;

export type MessageKey = keyof typeof plMessages;

export function getMessage(locale: Locale, key: string): string {
  const localeValue = MESSAGES[locale][key as MessageKey];
  if (localeValue) return localeValue;

  const fallbackValue = MESSAGES[DEFAULT_LOCALE][key as MessageKey];
  if (fallbackValue) return fallbackValue;

  return key;
}
