import type { Locale } from "./config";
import type { MessageKey } from "./messages";
import { getMessage } from "./messages";

export function getTranslator(locale: Locale) {
  return (key: MessageKey) => getMessage(locale, key);
}
