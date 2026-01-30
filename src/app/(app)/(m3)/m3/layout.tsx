import { AuthProvider } from "@/components/auth/auth-provider";
import { createClient } from "@/db/supabase.server";
import { DesignModeFooter } from "@/components/design-mode-footer";
import "./m3.css";

/**
 * M3 layout - Material 3 inspired UI foundation.
 * Scoped via .ui-m3 - no legacy styles, neutral only.
 */
export default async function M3Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <AuthProvider user={user}>
      <div className="ui-m3 min-h-dvh w-full bg-background text-foreground">
        <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
          {children}
        </main>
      </div>
      <DesignModeFooter currentMode="m3" />
    </AuthProvider>
  );
}
