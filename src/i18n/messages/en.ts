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
  "home.feature.exercises.title": "Exercise library",
  "home.feature.exercises.description":
    "Browse and manage your exercise library. Add custom exercises, filter by body part and type, and track your favorites.",
  "home.feature.workoutPlans.title": "Workout plans",
  "home.feature.workoutPlans.description":
    "Create and manage workout plans tailored to your goals. Organize exercises into sections and configure training parameters.",
  "home.feature.workoutSessions.title": "Session history",
  "home.feature.workoutSessions.description":
    "Track your training history. Review completed sessions, analyze progress, and resume interrupted workouts.",
  "home.feature.personalRecords.title": "Personal records",
  "home.feature.personalRecords.description":
    "Track personal records across metrics. Hit new PRs and monitor your progress over time.",
  "home.feature.assistant.title": "Workout assistant",
  "home.feature.assistant.description":
    "The workout assistant helps organize and execute your training sessions with guidance tailored to your needs.",
  "home.feature.importPlan.title": "Import workout plan",
  "home.feature.importPlan.description":
    "Import a workout plan from a JSON file. The app will parse it and generate a plan tailored to your needs.",
  "home.heroHeadline": "Designed to help you stay on track with your goals",
  "home.getStarted": "Get started",
  "home.featuresHeading": "Discover everything the app can do",
  "home.goToFeature": "Go to",
  "home.quote": "\"Strong today, unstoppable tomorrow.\"",
  "home.privacyPolicy": "Privacy Policy",
  "home.allRightsReserved": "All rights reserved.",
} as const satisfies MessageSchema;
