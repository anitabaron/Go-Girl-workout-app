import { requireAuth } from "@/lib/auth";

export default async function TestPage() {
  // Weryfikacja autoryzacji - automatyczne przekierowanie niezalogowanych użytkowników
  await requireAuth();

  return <div>Test Page</div>;
}
