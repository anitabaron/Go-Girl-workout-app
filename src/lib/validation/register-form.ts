import { z } from "zod";

import type { RegisterFormState } from "@/types/auth";

type RegisterValidationMessages = {
  emailRequired: string;
  emailInvalid: string;
  passwordRequired: string;
  passwordMin: string;
  passwordNoSpaces: string;
  confirmPasswordRequired: string;
  passwordsMismatch: string;
};

const DEFAULT_MESSAGES: RegisterValidationMessages = {
  emailRequired: "Email jest wymagany",
  emailInvalid: "Nieprawidłowy format email",
  passwordRequired: "Hasło jest wymagane",
  passwordMin: "Hasło musi mieć minimum 6 znaków",
  passwordNoSpaces: "Hasło nie może zawierać spacji",
  confirmPasswordRequired: "Potwierdzenie hasła jest wymagane",
  passwordsMismatch: "Hasła nie są identyczne",
};

function getMessages(
  messages?: Partial<RegisterValidationMessages>,
): RegisterValidationMessages {
  return {
    ...DEFAULT_MESSAGES,
    ...messages,
  };
}

/**
 * Schemat walidacji dla pola email.
 * - Wymagane pole
 * - Format email
 * - Trim wartości przed walidacją
 */
export const createEmailSchema = (
  messages?: Partial<RegisterValidationMessages>,
) => {
  const m = getMessages(messages);
  return z
    .string()
    .trim()
    .toLowerCase()
    .min(1, m.emailRequired)
    .email(m.emailInvalid);
};

/**
 * Schemat walidacji dla pola hasła.
 * - Wymagane pole
 * - Minimum 6 znaków (zgodnie z konfiguracją Supabase: minimum_password_length = 6)
 * - Nie może zawierać spacji
 */
export const createPasswordSchema = (
  messages?: Partial<RegisterValidationMessages>,
) => {
  const m = getMessages(messages);
  return z
    .string()
    .min(1, m.passwordRequired)
    .min(6, m.passwordMin)
    .regex(/^[^\s]+$/, m.passwordNoSpaces);
};

/**
 * Schemat walidacji dla pola potwierdzenia hasła.
 * - Wymagane pole
 * - Zgodność z hasłem
 */
export const createConfirmPasswordSchema = (
  password: string,
  messages?: Partial<RegisterValidationMessages>,
) => {
  const m = getMessages(messages);
  return z
    .string()
    .min(1, m.confirmPasswordRequired)
    .refine((val) => val === password, {
      message: m.passwordsMismatch,
    });
};

/**
 * Schemat walidacji całego formularza rejestracji.
 */
export const createRegisterFormSchema = (
  messages?: Partial<RegisterValidationMessages>,
) => {
  const m = getMessages(messages);
  return z
    .object({
      email: createEmailSchema(m),
      password: createPasswordSchema(m),
      confirmPassword: z.string().min(1, m.confirmPasswordRequired),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: m.passwordsMismatch,
      path: ["confirmPassword"], // Błąd przypisany do pola confirmPassword
    });
};

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
  password?: string,
  messages?: Partial<RegisterValidationMessages>,
): string | undefined {
  const m = getMessages(messages);
  try {
    switch (field) {
      case "email": {
        createEmailSchema(m).parse(value);
        break;
      }
      case "password": {
        createPasswordSchema(m).parse(value);
        break;
      }
      case "confirmPassword": {
        if (!password) {
          return m.confirmPasswordRequired;
        }
        createConfirmPasswordSchema(password, m).parse(value);
        break;
      }
    }
    return undefined;
  } catch (error) {
    if (error instanceof z.ZodError && error.issues && error.issues.length > 0) {
      return error.issues[0]?.message;
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
  formState: RegisterFormState,
  messages?: Partial<RegisterValidationMessages>,
): Partial<Record<keyof RegisterFormState, string>> | undefined {
  try {
    createRegisterFormSchema(messages).parse(formState);
    return undefined;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: Partial<Record<keyof RegisterFormState, string>> = {};
      error.issues.forEach((err) => {
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
