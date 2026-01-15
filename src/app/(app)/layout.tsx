import { TopNavigation } from "@/components/navigation/top-navigation";
import { BottomNavigation } from "@/components/navigation/bottom-navigation";
import { createClient } from "@/db/supabase.server";

/**
 * Layout dla wszystkich stron aplikacji (oprócz stron autoryzacji).
 * Zawiera nawigację górną (desktop) i dolną (mobile).
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
    <>
      {/* Top Navigation - Desktop only */}
      <div className="hidden md:block">
        <TopNavigation user={user} />
      </div>

      {children}

      {/* Bottom Navigation - Mobile only */}
      <div className="md:hidden">
        <BottomNavigation />
      </div>
    </>
  );
}
