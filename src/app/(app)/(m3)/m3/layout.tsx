import { AuthProvider } from "@/components/auth/auth-provider";
import { createClient } from "@/db/supabase.server";
import { DesignModeFooter } from "@/components/design-mode-footer";
import { NavigationRail } from "./_components";
import LenisProvider from "./_components/LenisProvider";
import "./m3.css";

/**
 * M3 Layout - Lenis smooth scroll on document (body).
 * LenisProvider initializes Lenis with default wrapper=window, content=documentElement.
 * No overflow containers here - scroll happens on body to avoid nested scroll conflicts.
 */
export default async function M3Layout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <AuthProvider user={user}>
      <LenisProvider>
        <div className="ui-m3 min-h-dvh w-full bg-background text-foreground flex flex-col overflow-visible">
          <NavigationRail />

          <main className="flex-1 w-full mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 md:pl-[80px] pb-20 md:pb-8">
            {children}
          </main>
        </div>
      </LenisProvider>

      <DesignModeFooter currentMode="m3" />
    </AuthProvider>
  );
}
