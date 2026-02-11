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
  "exercisesPage.title": "Exercises",
  "exercisesPage.description": "Browse and manage your exercise library.",
  "exercisesPage.countLabel": "exercises",
  "exercisesPage.addCta": "Add exercise",
  "exercisesPage.emptyTitle": "No exercises yet",
  "exercisesPage.emptyDescription": "Add your first exercise to get started.",
  "workoutPlansPage.title": "Workout plans",
  "workoutPlansPage.description": "Browse and manage your workout plans.",
  "workoutPlansPage.countLabel": "plans",
  "workoutPlansPage.createCta": "Create plan",
  "workoutSessionsPage.title": "Workout sessions",
  "workoutSessionsPage.description": "Browse your workout history.",
  "workoutSessionsPage.countLabel": "sessions",
  "workoutSessionsPage.startCta": "Start workout",
  "personalRecordsPage.title": "Personal records",
  "personalRecordsPage.description": "Track your progress and achievements.",
  "personalRecordsPage.fetchError": "Failed to fetch personal records.",
  "startWorkoutPage.backToSessions": "Back to sessions",
  "startWorkoutPage.title": "Start workout",
  "startWorkoutPage.resumeOrStartDescription":
    "Resume your active session or start a new one.",
  "startWorkoutPage.createFirstPlanDescription":
    "Create your first workout plan to get started.",
  "startWorkoutPage.emptyTitle": "No workout plans",
  "startWorkoutPage.emptyDescription":
    "Create your first workout plan to start training.",
  "startWorkoutPage.createPlanCta": "Create plan",
  "startWorkoutPage.selectPlanDescription": "Select a workout plan to begin.",
  "startWorkoutPage.selectPlanHeading": "Select workout plan",
  "workoutSessionDetailPage.backToSessions": "Back to sessions",
  "workoutSessionDetailPage.description": "Workout session details",
  "workoutSessionDetailPage.planDeletedFallback": "Plan deleted",
  "workoutPlanNewPage.copyOfPrefix": "Copy of",
  "workoutPlanNewPage.backToPlans": "Back to plans",
  "workoutPlanNewPage.duplicateTitle": "Duplicate workout plan",
  "workoutPlanNewPage.createTitle": "Create workout plan",
  "workoutPlanNewPage.duplicateDescription":
    "Edit the duplicated plan and save as a new item.",
  "workoutPlanNewPage.createDescription":
    "Create a new workout plan with exercises from your library.",
  "workoutPlanDetailPage.backToPlans": "Back to plans",
  "workoutPlanDetailPage.title": "Workout plan details",
  "workoutPlanEditPage.backToPlan": "Back to plan",
  "workoutPlanEditPage.title": "Edit workout plan",
  "exerciseDetailPage.title": "Exercise details",
  "exerciseDetailPage.backToList": "Back to list",
  "exerciseNewPage.copyOfPrefix": "Copy of",
  "exerciseNewPage.duplicateTitle": "Duplicate exercise",
  "exerciseNewPage.createTitle": "Add exercise",
  "exerciseNewPage.duplicateDescription":
    "Edit the duplicated exercise and save as a new item.",
  "exerciseNewPage.createDescription": "Create a new exercise for your library.",
  "exerciseNewPage.backToList": "Back to list",
  "exerciseEditPage.title": "Edit exercise",
  "exerciseEditPage.editingPrefix": "Editing:",
  "exerciseEditPage.backToDetail": "Back to detail",
  "personalRecordsExercisePage.backToRecords": "Back to records",
} as const satisfies MessageSchema;
