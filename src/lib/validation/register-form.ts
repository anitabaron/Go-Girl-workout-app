import { z } from "zod";

import type { RegisterFormState } from "@/types/auth";

/**
 * Schemat walidacji dla pola email.
 * - Wymagane pole
 * - Format email
 * - Trim wartości przed walidacją
 */
export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email jest wymagany")
  .email("Nieprawidłowy format email");

/**
 * Schemat walidacji dla pola hasła.
 * - Wymagane pole
 * - Minimum 6 znaków (zgodnie z konfiguracją Supabase: minimum_password_length = 6)
 * - Trim wartości przed walidacją (opcjonalnie, hasła zwykle nie są trimowane)
 */
export const passwordSchema = z
  .string()
  .min(1, "Hasło jest wymagane")
  .min(6, "Hasło musi mieć minimum 6 znaków");

/**
 * Schemat walidacji dla pola potwierdzenia hasła.
 * - Wymagane pole
 * - Zgodność z hasłem
 */
export const createConfirmPasswordSchema = (password: string) =>
  z
    .string()
    .min(1, "Potwierdzenie hasła jest wymagane")
    .refine((val) => val === password, {
      message: "Hasła nie są identyczne",
    });

/**
 * Schemat walidacji całego formularza rejestracji.
 */
export const registerFormSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Potwierdzenie hasła jest wymagane"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła nie są identyczne",
    path: ["confirmPassword"], // Błąd przypisany do pola confirmPassword
  });

/**
 * Waliduje pojedyncze pole formularza rejestracji.
 *
 * @param field - Nazwa pola do walidacji
 * @param value - Wartość pola
 * @param password - Wartość pola hasła (wymagana dla walidacji confirmPassword)
 * @returns Komunikat błędu lub undefined, jeśli pole jest poprawne
 */
export function validateRegisterField(
  field: keyof RegisterFormState,
  value: string,
  password?: string
): string | undefined {
  try {
    switch (field) {
      case "email": {
        emailSchema.parse(value);
        break;
      }
      case "password": {
        passwordSchema.parse(value);
        break;
      }
      case "confirmPassword": {
        if (!password) {
          return "Potwierdzenie hasła jest wymagane";
        }
        createConfirmPasswordSchema(password).parse(value);
        break;
      }
    }
    return undefined;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.errors[0]?.message;
    }
    return undefined;
  }
}

/**
 * Waliduje cały formularz rejestracji.
 *
 * @param formState - Stan formularza do walidacji
 * @returns Obiekt z błędami walidacji lub undefined, jeśli formularz jest poprawny
 */
export function validateRegisterForm(
  formState: RegisterFormState
): Partial<Record<keyof RegisterFormState, string>> | undefined {
  try {
    registerFormSchema.parse(formState);
    return undefined;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Partial<Record<keyof RegisterFormState, string>> = {};
      error.errors.forEach((err) => {
        const path = err.path[0] as keyof RegisterFormState;
        if (path) {
          errors[path] = err.message;
        }
      });
      return errors;
    }
    return undefined;
  }
}
