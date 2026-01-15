import {
  Dumbbell,
  Calendar,
  History,
  Trophy,
  Play,
} from "lucide-react";
import type { ComponentType } from "react";

/**
 * Typ sekcji nawigacji
 */
export type NavigationSection =
  | "exercises" // Biblioteka ćwiczeń
  | "workout-plans" // Plany treningowe
  | "workout-sessions" // Historia sesji
  | "personal-records"; // Rekordy

/**
 * Typ elementu nawigacji
 */
export type NavigationItem = {
  id: NavigationSection;
  label: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  mobileLabel?: string; // Krótsza etykieta na mobile
};

/**
 * Stałe danych nawigacji
 */
export const navigationItems: NavigationItem[] = [
  {
    id: "exercises",
    label: "Biblioteka ćwiczeń",
    href: "/exercises",
    icon: Dumbbell,
    mobileLabel: "Ćwiczenia",
  },
  {
    id: "workout-plans",
    label: "Plany treningowe",
    href: "/workout-plans",
    icon: Calendar,
    mobileLabel: "Plany",
  },
  {
    id: "workout-sessions",
    label: "Historia sesji",
    href: "/workout-sessions",
    icon: History,
    mobileLabel: "Historia",
  },
  {
    id: "personal-records",
    label: "Rekordy",
    href: "/personal-records",
    icon: Trophy,
    mobileLabel: "Rekordy",
  },
];

/**
 * Ścieżka do szybkiego startu sesji treningowej
 */
export const QUICK_START_HREF = "/workout-sessions/start";

/**
 * Ikona dla przycisku szybkiego startu
 */
export const QuickStartIcon = Play;
