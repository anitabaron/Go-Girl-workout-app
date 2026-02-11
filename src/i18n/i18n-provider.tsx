"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE_NAME,
  LOCALE_STORAGE_KEY,
  type Locale,
} from "./config";
import { getMessage, type MessageKey } from "./messages";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

type I18nProviderProps = {
  initialLocale: Locale;
  children: ReactNode;
};

function persistLocale(nextLocale: Locale) {
  document.cookie = `${LOCALE_COOKIE_NAME}=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
  window.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
  document.documentElement.lang = nextLocale;
}

export function I18nProvider({
  initialLocale,
  children,
}: Readonly<I18nProviderProps>) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") {
      return initialLocale;
    }

    const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);

    if (isLocale(storedLocale)) {
      return storedLocale;
    }

    return initialLocale;
  });

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
  }, []);

  useEffect(() => {
    persistLocale(locale);
  }, [locale]);

  const t = useCallback(
    (key: MessageKey) => {
      return getMessage(locale, key);
    },
    [locale],
  );

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
    }),
    [locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }

  return context;
}

export function useT() {
  return useI18n().t;
}

export function useLocale() {
  const { locale, setLocale } = useI18n();

  return {
    locale,
    setLocale,
    defaultLocale: DEFAULT_LOCALE,
  };
}
