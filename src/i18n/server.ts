import { getRequestLocale } from "./get-locale";
import type { Locale } from "./config";
import { getMessage } from "./messages";
import { buildTranslationKey } from "./translate-key";

type Translator = (key: string) => string;

type GetTranslationsOptions = {
  locale?: Locale;
  namespace?: string;
};

export async function getTranslations(namespace?: string): Promise<Translator>;
export async function getTranslations(
  opts?: GetTranslationsOptions,
): Promise<Translator>;
export async function getTranslations(
  arg?: string | GetTranslationsOptions,
): Promise<Translator> {
  const namespace = typeof arg === "string" ? arg : arg?.namespace;
  const locale = (typeof arg === "object" ? arg?.locale : undefined) ??
    (await getRequestLocale());

  return (key: string) => {
    const translationKey = buildTranslationKey(namespace, key);
    return getMessage(locale, translationKey);
  };
}

export async function getLocale(): Promise<Locale> {
  return getRequestLocale();
}
