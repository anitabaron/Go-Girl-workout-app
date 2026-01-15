import { z } from "zod";

/**
 * Schema Zod dla walidacji formularza resetu hasła.
 */
export const resetPasswordFormSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Adres email jest wymagany")
    .email({ message: "Nieprawidłowy format adresu email" }),
});

/**
 * Typ inferowany z schema dla formularza resetu hasła.
 */
export type ResetPasswordFormInput = z.infer<typeof resetPasswordFormSchema>;
