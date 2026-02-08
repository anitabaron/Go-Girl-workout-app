"use client";

import { createContext, useMemo, useContext, type ReactNode } from "react";

/**
 * Base path for auth redirects and links.
 * - Legacy: "" (so /login, /, /reset-password)
 * - M3: "/m3" (so /m3/login, /m3, /m3/reset-password)
 */
export type AuthRedirectContextValue = Readonly<{
  basePath: string;
}>;

const AuthRedirectContext = createContext<AuthRedirectContextValue>({
  basePath: "",
});

export function useAuthRedirect(): AuthRedirectContextValue {
  return useContext(AuthRedirectContext);
}

type AuthRedirectProviderProps = Readonly<{
  basePath: string;
  children: ReactNode;
}>;

export function AuthRedirectProvider({
  basePath,
  children,
}: AuthRedirectProviderProps) {
  const value = useMemo(() => ({ basePath }), [basePath]);
  return (
    <AuthRedirectContext.Provider value={value}>
      {children}
    </AuthRedirectContext.Provider>
  );
}
