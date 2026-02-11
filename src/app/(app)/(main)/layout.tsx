import { AuthProvider } from "@/components/auth/auth-provider";
import { createClient } from "@/db/supabase.server";
import { NavigationRail } from "@/components";
import { LanguageToggle } from "@/components/LanguageToggle";
import "./m3.css";
/**
 * M3 Layout – GSAP ScrollTrigger uses native scroll.
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
      <div className="ui-m3 min-h-dvh w-full text-foreground flex flex-col overflow-visible">
        <NavigationRail />
        <div className="fixed right-4 top-4 z-50">
          <LanguageToggle />
        </div>

        <main className="relative z-0 flex-1 w-full min-w-0 mx-auto max-w-4xl lg:max-w-6xl px-4 py-6 sm:px-6 sm:py-8 md:pl-[104px] lg:pl-[112px] pb-[var(--m3-mobile-nav-height)] md:pb-8">
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}
