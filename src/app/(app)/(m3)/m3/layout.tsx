import { AuthProvider } from "@/components/auth/auth-provider";
import { createClient } from "@/db/supabase.server";
import { DesignModeFooter } from "@/components/design-mode-footer";

/**
 * Layout dla designu M3.
 * Zawiera AuthProvider i minimalny pasek z toggle do przełączenia na Legacy.
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
      {children}
      <DesignModeFooter currentMode="m3" />
    </AuthProvider>
  );
}
