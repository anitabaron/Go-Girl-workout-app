import { TopNavigation } from "@/components/navigation/top-navigation";
import { BottomNavigation } from "@/components/navigation/bottom-navigation";
import { AuthProvider } from "@/components/auth/auth-provider";
import { createClient } from "@/db/supabase.server";

/**
 * Layout dla wszystkich stron aplikacji (oprócz stron autoryzacji).
 * Zawiera nawigację górną (desktop) i dolną (mobile).
 * 
 * AuthProvider synchronizuje stan autentykacji między Server Components a Client Components.
 */
export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Pobranie danych użytkowniczki z Supabase dla nawigacji
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <AuthProvider user={user}>
      {/* Top Navigation - Desktop only */}
      <div className="hidden md:block">
        <TopNavigation user={user} />
      </div>

      {/* Content with bottom padding on mobile to prevent overlap with bottom navigation */}
      <div className="md:pb-0">
        {children}
      </div>

      {/* Bottom Navigation - Mobile only */}
      <div className="md:hidden">
        <BottomNavigation user={user} />
      </div>
    </AuthProvider>
  );
}
