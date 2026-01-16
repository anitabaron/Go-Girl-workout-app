"use client";

/**
 * Komponent wyświetlający instrukcje dla użytkowniczki dotyczące ustawienia nowego hasła.
 */
export function ResetPasswordConfirmInstructions() {
  return (
    <div className="rounded-md bg-muted p-4">
      <p className="text-sm text-muted-foreground">
        Wprowadź nowe hasło dla swojego konta. Hasło musi mieć minimum 6 znaków.
      </p>
    </div>
  );
}
