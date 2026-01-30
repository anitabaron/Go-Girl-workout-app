import { AuthProvider } from "@/components/auth/auth-provider";
import { createClient } from "@/db/supabase.server";
import { DesignModeFooter } from "@/components/design-mode-footer";
import { NavigationRail } from "./_components";
import "./m3.css";

/**
 * M3 Expressive AppShell - Navigation Rail (desktop) / Bottom Nav (mobile) + main content.
 * Desktop: rail fixed left, content centered with max-width.
 * Mobile: bottom nav fixed, content scrolls with padding for nav.
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
      <div className="ui-m3 min-h-dvh w-full bg-background text-foreground flex flex-col">
        <NavigationRail />

        {/* Main content: offset by rail on desktop, padded for bottom nav on mobile */}
        <main className="flex-1 w-full mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 md:pl-[80px] pb-20 md:pb-8">
          {children}
        </main>
      </div>
      <DesignModeFooter currentMode="m3" />
    </AuthProvider>
  );
}
