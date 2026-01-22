# Struktura komponentów i zależności - ExercisesList

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    src/components/exercises/exercises-list.tsx              │
│                         (Server Component)                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
    ┌───────────────────────────────┐   ┌───────────────────────────────┐
    │  ExerciseCard                 │   │  EmptyState                   │
    │  (Client Component)           │   │  (Client Component)           │
    │  src/components/exercises/    │   │  src/components/exercises/    │
    │  exercise-card.tsx            │   │  empty-state.tsx              │
    └───────────────────────────────┘   └───────────────────────────────┘
                    │                               │
                    │                               │
        ┌───────────┼───────────┐                   │
        │           │           │                   │
        ▼           ▼           ▼                   │
    ┌───────┐  ┌───────┐  ┌──────────────┐         │
    │ Card  │  │ Badge │  │CardAction    │         │
    │ (UI)  │  │ (UI)  │  │Buttons (UI)  │         │
    └───────┘  └───────┘  └──────────────┘         │
                            │                       │
                            ▼                       │
                    ┌───────────────┐               │
                    │DeleteExercise │               │
                    │Dialog         │               │
                    └───────────────┘               │
                            │                       │
                            ▼                       │
                    ┌───────────────┐               │
                    │ Dialog (UI)   │               │
                    │ Button (UI)   │               │
                    └───────────────┘               │
                                                    │
                                                    ▼
                                            ┌───────────────┐
                                            │ Card (UI)     │
                                            │ Button (UI)   │
                                            │ Dumbbell icon │
                                            └───────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                    UŻYCIE W STRONIE                                          │
│                    src/app/(app)/exercises/page.tsx                          │
│                         (Server Component)                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┬───────────────┐
                    │               │               │               │
                    ▼               ▼               ▼               ▼
    ┌───────────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │ ExercisesList     │  │ExerciseFilters│  │ExerciseSort  │  │AddExercise   │
    │ (zobacz wyżej)    │  │(Client)       │  │(Client)      │  │Button        │
    └───────────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
                                    │               │               │
                                    ▼               ▼               ▼
                            ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
                            │ Input (UI)   │  │ Select (UI)  │  │ Button (UI)  │
                            │ Select (UI)  │  │ Button (UI)  │  │ Link         │
                            │ Tooltip (UI) │  │              │  │ Plus icon    │
                            └──────────────┘  └──────────────┘  └──────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
    ┌───────────────────┐  ┌──────────────┐  ┌──────────────┐
    │ PageHeaderSection │  │ PageHeader   │  │              │
    │ (Server)          │  │ (Client)     │  │              │
    └───────────────────┘  └──────────────┘  └──────────────┘
            │                       │
            │                       ▼
            │               ┌──────────────┐
            │               │ Button (UI)  │
            │               │ ArrowLeft    │
            │               └──────────────┘
            │
            ▼
    ┌──────────────┐
    │              │
    └──────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                    ZALEŻNOŚCI TYPÓW I WARTOŚCI                               │
└─────────────────────────────────────────────────────────────────────────────┘

exercises-list.tsx
    │
    ├──> @/types
    │       └──> ExerciseDTO
    │               └──> ExerciseEntity (z database.types)
    │
    └──> exercise-card.tsx
            │
            ├──> @/types
            │       └──> ExerciseDTO
            │
            └──> @/lib/constants
                    ├──> EXERCISE_PART_LABELS
                    └──> EXERCISE_TYPE_LABELS


┌─────────────────────────────────────────────────────────────────────────────┐
│                    ZALEŻNOŚCI SERWISÓW I API                                 │
└─────────────────────────────────────────────────────────────────────────────┘

exercises/page.tsx (Server Component)
    │
    ├──> @/lib/validation/exercises
    │       └──> exerciseQuerySchema (Zod)
    │
    ├──> @/lib/auth
    │       └──> requireAuth()
    │
    ├──> @/services/exercises
    │       └──> listExercisesService(userId, queryParams)
    │               │
    │               ├──> @/repositories/exercises
    │               │       └──> listExercises()
    │               │
    │               └──> @/db/supabase.server
    │                       └──> createClient()
    │
    └──> @/types
            └──> ExerciseQueryParams


┌─────────────────────────────────────────────────────────────────────────────┐
│                    ZALEŻNOŚCI UI KOMPONENTÓW (Shadcn/ui)                     │
└─────────────────────────────────────────────────────────────────────────────┘

ExerciseCard
    ├──> @/components/ui/card
    │       ├──> Card
    │       ├──> CardContent
    │       ├──> CardHeader
    │       └──> CardTitle
    │
    ├──> @/components/ui/badge
    │       └──> Badge
    │
    └──> @/components/ui/card-action-buttons
            └──> CardActionButtons
                    └──> @/components/ui/button
                            └──> Button

EmptyState
    ├──> @/components/ui/card
    │       ├──> Card
    │       ├──> CardContent
    │       ├──> CardDescription
    │       ├──> CardHeader
    │       └──> CardTitle
    │
    └──> @/components/ui/button
            └──> Button

DeleteExerciseDialog
    ├──> @/components/ui/dialog
    │       ├──> Dialog
    │       ├──> DialogContent
    │       ├──> DialogDescription
    │       ├──> DialogFooter
    │       ├──> DialogHeader
    │       └──> DialogTitle
    │
    └──> @/components/ui/button
            └──> Button

ExerciseFilters
    ├──> @/components/ui/button
    │       └──> Button
    │
    ├──> @/components/ui/input
    │       └──> Input
    │
    ├──> @/components/ui/select
    │       ├──> Select
    │       ├──> SelectContent
    │       ├──> SelectItem
    │       ├──> SelectTrigger
    │       └──> SelectValue
    │
    └──> @/components/ui/tooltip
            ├──> Tooltip
            ├──> TooltipContent
            ├──> TooltipProvider
            └──> TooltipTrigger

ExerciseSort
    ├──> @/components/ui/button
    │       └──> Button
    │
    └──> @/components/ui/select
            ├──> Select
            ├──> SelectContent
            ├──> SelectItem
            ├──> SelectTrigger
            └──> SelectValue

AddExerciseButton
    └──> @/components/ui/button
            └──> Button

PageHeader
    └──> @/components/ui/button
            └──> Button


┌─────────────────────────────────────────────────────────────────────────────┐
│                    ZALEŻNOŚCI ZEWNĘTRZNE                                     │
└─────────────────────────────────────────────────────────────────────────────┘

React & Next.js
    ├──> react (useState, useEffect, useRouter, etc.)
    ├──> next/link (Link)
    ├──> next/navigation (useRouter, useSearchParams, usePathname)
    └──> next/server (NextResponse)

Icons
    └──> lucide-react
            ├──> Dumbbell
            ├──> X
            ├──> ArrowUpDown
            ├──> ArrowUp
            ├──> ArrowDown
            ├──> Plus
            ├──> ArrowLeft
            ├──> Edit
            └──> Trash2

Notifications
    └──> sonner
            └──> toast


┌─────────────────────────────────────────────────────────────────────────────┐
│                    STRUKTURA PLIKÓW                                          │
└─────────────────────────────────────────────────────────────────────────────┘

src/
├── components/
│   ├── exercises/
│   │   ├── exercises-list.tsx          ← PUNKT STARTOWY
│   │   ├── exercise-card.tsx
│   │   ├── empty-state.tsx
│   │   ├── exercise-filters.tsx
│   │   ├── exercise-sort.tsx
│   │   ├── add-exercise-button.tsx
│   │   └── details/
│   │       └── delete-exercise-dialog.tsx
│   │
│   ├── ui/                              (Shadcn/ui components)
│   │   ├── card.tsx
│   │   ├── badge.tsx
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── dialog.tsx
│   │   ├── tooltip.tsx
│   │   └── card-action-buttons.tsx
│   │
│   ├── navigation/
│   │   └── page-header.tsx
│   │
│   └── layout/
│       └── page-header-section.tsx
│
├── app/
│   └── (app)/
│       └── exercises/
│           └── page.tsx                 (używa ExercisesList)
│
├── services/
│   └── exercises.ts                     (listExercisesService)
│
├── lib/
│   ├── validation/
│   │   └── exercises.ts                 (exerciseQuerySchema)
│   ├── auth.ts                          (requireAuth)
│   └── constants.ts                     (EXERCISE_*_LABELS)
│
└── types.ts                             (ExerciseDTO, ExerciseQueryParams)


┌─────────────────────────────────────────────────────────────────────────────┐
│                    PRZEPŁYW DANYCH                                           │
└─────────────────────────────────────────────────────────────────────────────┘

1. exercises/page.tsx (Server Component)
   │
   ├──> Waliduje searchParams przez exerciseQuerySchema
   ├──> Pobiera userId przez requireAuth()
   ├──> Wywołuje listExercisesService(userId, queryParams)
   │       │
   │       └──> Repository → Supabase → Database
   │
   └──> Renderuje ExercisesList z danymi

2. ExercisesList (Server Component)
   │
   ├──> Jeśli exercises.length === 0
   │       └──> Renderuje EmptyState (Client Component)
   │
   └──> Jeśli exercises.length > 0
           └──> Renderuje ExerciseCard[] dla każdego ćwiczenia

3. ExerciseCard (Client Component)
   │
   ├──> Wyświetla dane ćwiczenia
   ├──> Obsługuje kliknięcie → nawigacja do /exercises/[id]
   ├──> Obsługuje edycję → nawigacja do /exercises/[id]/edit
   └──> Obsługuje usuwanie → otwiera DeleteExerciseDialog

4. ExerciseFilters (Client Component)
   │
   ├──> Synchronizuje stan z URL searchParams
   ├──> Debounce dla wyszukiwania (500ms)
   └──> Aktualizuje URL → powoduje re-render strony (Server Component)

5. ExerciseSort (Client Component)
   │
   └──> Aktualizuje URL searchParams → powoduje re-render strony


┌─────────────────────────────────────────────────────────────────────────────┐
│                    PODZIAŁ SERVER vs CLIENT COMPONENTS                      │
└─────────────────────────────────────────────────────────────────────────────┘

SERVER COMPONENTS (brak "use client")
├── exercises-list.tsx
├── exercises/page.tsx
└── page-header-section.tsx

CLIENT COMPONENTS ("use client")
├── exercise-card.tsx              (interaktywność, routing, state)
├── empty-state.tsx                (Link, Button)
├── exercise-filters.tsx           (useState, useEffect, useSearchParams)
├── exercise-sort.tsx              (useSearchParams, useRouter)
├── add-exercise-button.tsx        (Link)
├── delete-exercise-dialog.tsx     (useState, fetch API, toast)
├── page-header.tsx                (useRouter)
└── card-action-buttons.tsx        (onClick handlers)
