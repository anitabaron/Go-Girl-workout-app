"use client";

import { useRouter } from "next/navigation";
import { LogOut, User as UserIcon } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/db/supabase.client";
import { useAuthStore } from "@/stores/auth-store";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface UserMenuProps {
  user: User | null;
}

/**
 * Client Component z dropdown menu użytkowniczki zawierającym opcje:
 * wylogowanie, ustawienia (jeśli w zakresie).
 * Używa DropdownMenu z shadcn/ui.
 */
export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter();
  const clearUser = useAuthStore((state) => state.clearUser);

  if (!user) {
    return null;
  }

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      toast.error("Nie udało się wylogować. Spróbuj ponownie.");
      console.error("Sign out error:", error);
      return;
    }

    // Czyszczenie Zustand store
    clearUser();

    // Kolejność operacji: signOut() → clearUser() → router.push() → router.refresh()
    router.push("/");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full"
          aria-label="Menu użytkowniczki"
        >
          <UserIcon className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {user.email ?? "Użytkowniczka"}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Wyloguj się</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
