/**
 * Typy dla widoku rejestracji i autoryzacji.
 */

/**
 * ViewModel reprezentujący stan formularza rejestracji.
 */
export type RegisterFormState = {
  email: string;
  password: string;
  confirmPassword: string;
};

/**
 * Typ reprezentujący błędy walidacji formularza rejestracji.
 */
export type RegisterFormErrors = {
  email?: string;
  password?: string;
  confirmPassword?: string;
  _form?: string[]; // Błędy na poziomie formularza (np. z API)
};

