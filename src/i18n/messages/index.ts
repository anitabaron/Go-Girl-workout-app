import type { Locale } from "../config";
import { DEFAULT_LOCALE } from "../config";
import { enMessages } from "./en";
import { plMessages } from "./pl";

export const MESSAGES = {
  pl: plMessages,
  en: enMessages,
} as const;

export type MessageKey = keyof typeof plMessages;

export function getMessage(locale: Locale, key: MessageKey): string {
  return MESSAGES[locale][key] ?? MESSAGES[DEFAULT_LOCALE][key] ?? key;
}
