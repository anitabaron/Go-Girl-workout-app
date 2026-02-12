import { AuthRedirectProvider } from "@/contexts/auth-redirect-context";
import "@/app/(app)/m3.css";

/**
 * Layout for unauthenticated auth pages (login, register, reset-password).
 * Uses m3.css token system; no NavigationRail.
 * Sets basePath="" so forms and links redirect to main app (/).
 */
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AuthRedirectProvider basePath="">
      <div className="ui-auth-pink min-h-dvh w-full bg-background text-foreground flex flex-col">
        {children}
      </div>
    </AuthRedirectProvider>
  );
}
