import { AuthProvider } from "@/components/auth/auth-provider";
import { createClient } from "@/db/supabase.server";
import { NavigationRail } from "@/components/layout/NavigationRail";
import { LanguageToggle } from "@/components/layout/LanguageToggle";
import { AIAssistantShell } from "@/components/ai/AIAssistantShell";
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
      <div className="min-h-dvh w-full text-foreground flex flex-col overflow-visible">
        <NavigationRail />
        <AIAssistantShell />

        <main className="relative z-0 flex-1 min-w-0 mx-auto max-w-7xl px-8 py-6 sm:px-12 sm:py-8 md:mx-0 md:ml-[80px] md:mr-0 md:max-w-none md:px-16 md:pt-10 xl:px-6 xl:pr-[444px] pb-[calc(var(--m3-mobile-nav-height)+0.5rem)] md:pb-8">
          <div className="mb-4 hidden md:flex md:justify-end">
            <LanguageToggle />
          </div>
          {children}
        </main>
      </div>
    </AuthProvider>
  );
}
