import type { plMessages } from "./pl";

type MessageSchema = {
  [K in keyof typeof plMessages]: string;
};

export const enMessages = {
  "nav.mainNavigation": "Main navigation",
  "nav.home": "Home",
  "nav.exercises": "Exercises",
  "nav.plans": "Plans",
  "nav.sessions": "Sessions",
  "nav.records": "Records",
  "nav.start": "Start",
  "auth.signIn": "Sign in",
  "auth.signOut": "Sign out",
  "auth.signOutError": "Could not sign out. Please try again.",
  "theme.toggleDarkMode": "Toggle dark mode",
  "lang.switchAria": "Switch language",
  "lang.polish": "Polish",
  "lang.english": "English",
} as const satisfies MessageSchema;
