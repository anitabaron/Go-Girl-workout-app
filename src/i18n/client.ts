"use client";

import { useCallback } from "react";
import { useI18n, useLocale } from "./i18n-provider";
import { getMessage } from "./messages";
import { buildTranslationKey } from "./translate-key";

export function useTranslations(namespace?: string) {
  const { locale } = useI18n();

  return useCallback(
    (key: string) => {
      const translationKey = buildTranslationKey(namespace, key);
      return getMessage(locale, translationKey);
    },
    [locale, namespace],
  );
}

export { useLocale };
