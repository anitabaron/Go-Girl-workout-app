import { AuthRedirectProvider } from "@/contexts/auth-redirect-context";
import "@/app/(app)/(m3)/m3/m3.css";

/**
 * M3 layout for unauthenticated auth pages (login, register, reset-password).
 * Uses .ui-m3 and m3.css; no NavigationRail.
 * Sets basePath="/m3" so forms and links redirect to /m3/*.
 */
export default function M3AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AuthRedirectProvider basePath="/m3">
      <div className="ui-m3 min-h-dvh w-full bg-background text-foreground flex flex-col">
        {children}
      </div>
    </AuthRedirectProvider>
  );
}
