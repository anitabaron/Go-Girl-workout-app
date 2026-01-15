# Plan implementacji widoku Layout główny

## 1. Przegląd

Widok główny (`/`) to centralny punkt aplikacji Go Girl, zapewniający spójną strukturę nawigacji i layoutu dla wszystkich widoków aplikacji. Widok zachowuje istniejący Hero i Footer, a wzbogaca je o responsywną nawigację (bottom navigation na mobile, top bar na desktop), wyróżniony przycisk "Start treningu", menu użytkowniczki oraz sekcję z przeglądem funkcji aplikacji. Implementacja wykorzystuje Next.js 16 App Router z podziałem na Server Components (dla struktury layoutu) i Client Components (dla interaktywnych elementów nawigacji).

## 2. Routing widoku

- **Ścieżka**: `/` (root layout)
- **Plik główny**: `src/app/page.tsx` (strona główna)
- **Plik layoutu**: `src/app/layout.tsx` (root layout)
- **Typ**: Server Component (główny page) z zagnieżdżonymi Client Components dla nawigacji

## 3. Struktura komponentów

```
HomePage (Server Component)
├── MainLayout (Server Component wrapper)
│   ├── Header (Server Component)
│   │   ├── HeroSection (Server Component)
│   │   │   ├── Logo (Image)
│   │   │   └── HeroContent (Server Component)
│   │   └── TopNavigation (Client Component) - tylko desktop (≥768px)
│   │       ├── LogoLink (Client Component)
│   │       ├── NavigationTabs (Client Component)
│   │       ├── QuickStartButton (Client Component)
│   │       └── UserMenu (Client Component)
│   ├── MainContent (Server Component)
│   │   ├── FeaturesOverview (Server Component)
│   │   │   └── FeatureCard[] (Server Component)
│   │   └── BottomNavigation (Client Component) - tylko mobile (<768px)
│   │       ├── NavItem[] (Client Component)
│   │       └── QuickStartButton (Client Component) - FAB
│   └── Footer (Server Component)
│       ├── Quote (Server Component)
│       └── SocialLinks (Server Component)
```

## 4. Szczegóły komponentów

### HomePage

- **Opis komponentu**: Główny komponent strony głównej, Server Component odpowiedzialny za renderowanie struktury widoku z Hero, sekcją funkcji i Footerem. Integruje komponenty nawigacji i zapewnia spójny layout.
- **Główne elementy**:
  - Kontener główny z layoutem
  - Header z Hero i nawigacją desktop
  - Main content z przeglądem funkcji
  - Bottom navigation (mobile)
  - Footer
- **Obsługiwane interakcje**:
  - Renderowanie struktury layoutu
  - Integracja nawigacji responsywnej
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak specyficznych typów
- **Props**: Brak (Server Component)

### MainLayout

- **Opis komponentu**: Server Component wrapper zapewniający spójną strukturę layoutu dla wszystkich widoków aplikacji. Renderuje nawigację (mobile/desktop), sprawdza autoryzację (przez middleware), zapewnia spójny layout.
- **Główne elementy**:
  - Kontener główny z min-height: 100vh
  - Header z nawigacją
  - Main content area (flex-grow)
  - Footer
- **Obsługiwane interakcje**:
  - Renderowanie struktury layoutu
  - Przekazywanie children (treść strony)
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak specyficznych typów
- **Props**:
  - `children: React.ReactNode` - treść strony do renderowania

### HeroSection

- **Opis komponentu**: Server Component renderujący sekcję Hero z logo aplikacji i hasłem. Zachowuje istniejący design i funkcjonalność.
- **Główne elementy**:
  - Kontener header z tłem primary
  - Logo (Image z Next.js)
  - Tytuł: "designed to help you stay on track with your goals"
  - Podtytuł: "stay tuned"
- **Obsługiwane interakcje**: Brak (statyczna sekcja)
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak specyficznych typów
- **Props**: Brak

### TopNavigation (desktop)

- **Opis komponentu**: Client Component renderujący górny pasek nawigacji na desktop (≥768px). Zawiera logo, zakładki nawigacyjne, przycisk "Start treningu" i menu użytkowniczki.
- **Główne elementy**:
  - Kontener z fixed position (top)
  - Logo/Nazwa aplikacji (po lewej)
  - Tabs (shadcn/ui) z sekcjami:
    - Biblioteka ćwiczeń → `/exercises`
    - Plany treningowe → `/workout-plans`
    - Historia sesji → `/workout-sessions`
    - Rekordy → `/personal-records`
  - Przycisk "Start treningu" (primary button, po prawej)
  - Menu użytkowniczki (dropdown, po prawej)
- **Obsługiwane interakcje**:
  - Kliknięcie w tab → nawigacja do odpowiedniej sekcji
  - Kliknięcie "Start treningu" → nawigacja do `/workout-sessions/start`
  - Kliknięcie menu użytkowniczki → otwarcie dropdown
  - Wyróżnienie aktywnej sekcji (underline, kolor)
  - Keyboard navigation (Tab, Enter/Space)
- **Obsługiwana walidacja**:
  - Sprawdzanie aktualnej ścieżki dla wyróżnienia aktywnej sekcji
  - Walidacja dostępności sesji użytkowniczki
- **Typy**:
  - `NavigationSection` - enum sekcji nawigacji
- **Props**:
  - `activeSection?: string` - aktualna aktywna sekcja (opcjonalnie, domyślnie z pathname)

### BottomNavigation (mobile)

- **Opis komponentu**: Client Component renderujący dolny pasek nawigacji na mobile (<768px). Zawiera ikony z etykietami dla każdej sekcji oraz wyróżniony przycisk "Start treningu" jako FAB.
- **Główne elementy**:
  - Kontener z fixed position (bottom)
  - Ikony nawigacyjne z etykietami:
    - Biblioteka ćwiczeń (ikona: dumbbell/list) → `/exercises`
    - Plany treningowe (ikona: calendar/clipboard) → `/workout-plans`
    - Start treningu (ikona: play, FAB w centrum, większy) → `/workout-sessions/start`
    - Historia sesji (ikona: history/clock) → `/workout-sessions`
    - Rekordy (ikona: trophy/star) → `/personal-records`
  - Wyróżnienie aktywnej sekcji (kolor, podkreślenie)
- **Obsługiwane interakcje**:
  - Kliknięcie w ikonę → nawigacja do odpowiedniej sekcji
  - Kliknięcie FAB "Start treningu" → nawigacja do `/workout-sessions/start`
  - Wyróżnienie aktywnej sekcji
  - Keyboard navigation (Tab, Enter/Space)
- **Obsługiwana walidacja**:
  - Sprawdzanie aktualnej ścieżki dla wyróżnienia aktywnej sekcji
- **Typy**:
  - `NavigationSection` - enum sekcji nawigacji
- **Props**:
  - `activeSection?: string` - aktualna aktywna sekcja (opcjonalnie, domyślnie z pathname)

### QuickStartButton

- **Opis komponentu**: Client Component z wyróżnionym przyciskiem szybkiego startu sesji treningowej. Renderuje się jako FAB na mobile i primary button na desktop.
- **Główne elementy**:
  - Przycisk z ikoną play i etykietą "Start treningu"
  - Link do `/workout-sessions/start`
  - Wariant: FAB na mobile, primary button na desktop
- **Obsługiwane interakcje**:
  - Kliknięcie → nawigacja do `/workout-sessions/start`
  - Keyboard navigation (Enter/Space)
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak specyficznych typów
- **Props**:
  - `variant?: "fab" | "button"` - wariant przycisku (auto-detect z breakpoint)
  - `className?: string` - dodatkowe klasy CSS

### UserMenu

- **Opis komponentu**: Client Component z dropdown menu użytkowniczki zawierającym opcje: wylogowanie, ustawienia (jeśli w zakresie). Używa DropdownMenu z shadcn/ui.
- **Główne elementy**:
  - Trigger button z awatarem/ikoną użytkowniczki
  - Dropdown menu z opcjami:
    - Email użytkowniczki (tylko wyświetlenie)
    - Separator
    - "Wyloguj się" (z ikoną)
    - Opcjonalnie: "Ustawienia" (jeśli w zakresie)
- **Obsługiwane interakcje**:
  - Kliknięcie triggera → otwarcie/zamknięcie dropdown
  - Kliknięcie "Wyloguj się" → wylogowanie przez Supabase Auth
  - Kliknięcie "Ustawienia" → nawigacja do `/settings` (jeśli dostępne)
  - Escape → zamknięcie dropdown
  - Keyboard navigation
- **Obsługiwana walidacja**:
  - Sprawdzanie czy użytkowniczka jest zalogowana
  - Obsługa błędów wylogowania
- **Typy**:
  - `User` - typ użytkowniczki z Supabase Auth
- **Props**:
  - `user: User | null` - dane użytkowniczki (opcjonalnie, jeśli null to nie renderuje menu)

### FeaturesOverview

- **Opis komponentu**: Server Component renderujący sekcję z przeglądem funkcji aplikacji. Zastępuje istniejącą sekcję "Planned features" rzeczywistymi funkcjami aplikacji.
- **Główne elementy**:
  - Kontener z tytułem "Funkcje aplikacji"
  - Grid z kartami funkcji (FeatureCard)
  - Responsywny layout (1 kolumna mobile, 2 kolumny desktop)
- **Obsługiwane interakcje**: Brak (statyczna sekcja)
- **Obsługiwana walidacja**: Brak
- **Typy**:
  - `Feature` - typ funkcji aplikacji
- **Props**: Brak

### FeatureCard

- **Opis komponentu**: Server Component renderujący kartę pojedynczej funkcji aplikacji z ikoną, tytułem i opisem.
- **Główne elementy**:
  - Ikona funkcji (opcjonalnie)
  - Tytuł funkcji (np. "Biblioteka ćwiczeń", "Plany treningowe")
  - Opis funkcji (krótki tekst wyjaśniający)
  - Opcjonalnie: Link do odpowiedniej sekcji
- **Obsługiwane interakcje**:
  - Kliknięcie karty → nawigacja do odpowiedniej sekcji (opcjonalnie)
  - Keyboard navigation (jeśli link)
- **Obsługiwana walidacja**: Brak
- **Typy**:
  - `Feature` - typ funkcji aplikacji
- **Props**:
  - `feature: Feature` - dane funkcji do wyświetlenia

### Footer

- **Opis komponentu**: Server Component renderujący stopkę aplikacji. Zachowuje istniejący design i funkcjonalność.
- **Główne elementy**:
  - Kontener footer z tłem primary
  - Cytat: "Strong today, unstoppable tomorrow."
  - Linki społecznościowe (GitHub, LinkedIn)
  - Copyright notice
- **Obsługiwane interakcje**:
  - Kliknięcie linków społecznościowych → otwarcie w nowej karcie
- **Obsługiwana walidacja**: Brak
- **Typy**: Brak specyficznych typów
- **Props**: Brak

## 5. Typy

### Typy nawigacji

#### NavigationSection

```typescript
type NavigationSection = 
  | "exercises"      // Biblioteka ćwiczeń
  | "workout-plans"  // Plany treningowe
  | "workout-sessions" // Historia sesji
  | "personal-records"; // Rekordy
```

#### NavigationItem

```typescript
type NavigationItem = {
  id: NavigationSection;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  mobileLabel?: string; // Krótsza etykieta na mobile
};
```

### Typy funkcji aplikacji

#### Feature

```typescript
type Feature = {
  id: string;
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  href?: string; // Opcjonalny link do sekcji
};
```

### Typy użytkowniczki

#### User (z Supabase Auth)

```typescript
// Używamy typu User z @supabase/supabase-js
import type { User } from "@supabase/supabase-js";
```

## 6. Zarządzanie stanem

### Stan nawigacji

- **Aktywna sekcja**: Określana na podstawie `pathname` z `usePathname()` (Next.js)
- **Nie wymaga custom hook**: Używa wbudowanych hooków Next.js

### Stan użytkowniczki

- **Dane użytkowniczki**: Pobierane przez Server Component z Supabase Auth
- **Sesja**: Zarządzana przez middleware i Supabase SSR
- **Nie wymaga custom hook**: Używa `createClient()` z `@/db/supabase.server`

### Stan menu użytkowniczki

- **Otwarcie/zamknięcie dropdown**: Zarządzane przez DropdownMenu z shadcn/ui (wewnętrzny stan)
- **Nie wymaga custom hook**: Używa wbudowanego stanu komponentu

### Responsywność

- **Breakpoint**: 768px (mobile < 768px, desktop ≥ 768px)
- **Wykrywanie**: Przez CSS media queries i `useMediaQuery` hook (opcjonalnie) lub przez CSS classes

## 7. Integracja API

### Autoryzacja

- **Endpoint**: Brak bezpośredniego endpointu API
- **Metoda**: Używa Supabase Auth przez `createClient()` w Server Components
- **Typ żądania**: Brak (sprawdzanie sesji przez middleware)
- **Typ odpowiedzi**: `{ user: User | null }` z `supabase.auth.getUser()`

### Pobieranie danych użytkowniczki

- **Metoda**: Server Component używa `createClient()` z `@/db/supabase.server`
- **Funkcja**: `await supabase.auth.getUser()`
- **Typ odpowiedzi**: `{ data: { user: User | null }, error: AuthError | null }`

### Wylogowanie

- **Metoda**: Client Component używa `supabase` z `@/db/supabase.client`
- **Funkcja**: `await supabase.auth.signOut()`
- **Typ żądania**: Brak parametrów
- **Typ odpowiedzi**: `{ error: AuthError | null }`
- **Obsługa**: Po udanym wylogowaniu przekierowanie do `/login`

## 8. Interakcje użytkownika

### Nawigacja między sekcjami

1. **Użytkowniczka klika tab/ikonę nawigacji**
   - Akcja: Aktualizacja URL przez `useRouter().push(href)`
   - Rezultat: Przekierowanie do odpowiedniej sekcji
   - Wyróżnienie: Aktywna sekcja wizualnie wyróżniona

2. **Użytkowniczka klika "Start treningu"**
   - Akcja: Nawigacja do `/workout-sessions/start`
   - Rezultat: Przekierowanie do widoku wyboru planu/wznowienia sesji

3. **Użytkowniczka klika logo**
   - Akcja: Nawigacja do `/` (strona główna)
   - Rezultat: Powrót do widoku głównego

### Menu użytkowniczki

1. **Użytkowniczka klika awatar/ikonę użytkowniczki**
   - Akcja: Otwarcie dropdown menu
   - Rezultat: Wyświetlenie opcji (wylogowanie, ustawienia)

2. **Użytkowniczka klika "Wyloguj się"**
   - Akcja: Wywołanie `supabase.auth.signOut()`
   - Rezultat: Wylogowanie i przekierowanie do `/login`
   - Obsługa błędów: Toast notification przy błędzie wylogowania

3. **Użytkowniczka klika "Ustawienia"** (jeśli dostępne)
   - Akcja: Nawigacja do `/settings`
   - Rezultat: Przekierowanie do widoku ustawień

### Nawigacja klawiaturowa

1. **Tab**: Przejście między interaktywnymi elementami nawigacji
2. **Enter/Space**: Aktywacja przycisku/linku
3. **Escape**: Zamknięcie dropdown menu użytkowniczki
4. **Arrow keys**: Nawigacja w dropdown menu (obsługiwane przez shadcn/ui)

### Responsywność

1. **Zmiana rozmiaru okna**
   - Akcja: Automatyczne przełączenie między bottom navigation (mobile) a top navigation (desktop)
   - Rezultat: Odpowiednia nawigacja wyświetlana w zależności od breakpoint

## 9. Warunki i walidacja

### Warunki wyświetlania nawigacji

- **Desktop (≥768px)**: Wyświetlana TopNavigation, ukryta BottomNavigation
- **Mobile (<768px)**: Wyświetlana BottomNavigation, ukryta TopNavigation
- **Weryfikacja**: Przez CSS media queries (`hidden md:block` / `block md:hidden`)

### Warunki wyświetlania menu użytkowniczki

- **Użytkowniczka zalogowana**: Menu użytkowniczki widoczne z opcjami
- **Użytkowniczka niezalogowana**: Menu użytkowniczki ukryte (middleware przekierowuje do `/login`)
- **Weryfikacja**: Sprawdzanie `user` z `supabase.auth.getUser()`

### Warunki wyróżnienia aktywnej sekcji

- **Aktualna ścieżka**: Porównanie `pathname` z `href` każdej sekcji nawigacji
- **Wyróżnienie**: Aktywna sekcja otrzymuje dodatkowe klasy CSS (underline, kolor)
- **Weryfikacja**: Przez `usePathname()` z Next.js

### Warunki wyświetlania przycisku "Start treningu"

- **Zawsze widoczny**: Przycisk "Start treningu" jest zawsze widoczny i dostępny
- **Wariant**: FAB na mobile, primary button na desktop
- **Weryfikacja**: Przez breakpoint CSS

## 10. Obsługa błędów

### Błąd wylogowania

- **Scenariusz**: `supabase.auth.signOut()` zwraca błąd
- **Obsługa**: 
  - Toast notification z komunikatem: "Nie udało się wylogować. Spróbuj ponownie."
  - Logowanie błędu do konsoli (development)
  - Użytkowniczka pozostaje zalogowana

### Błąd pobierania danych użytkowniczki

- **Scenariusz**: `supabase.auth.getUser()` zwraca błąd w Server Component
- **Obsługa**: 
  - Fallback: Menu użytkowniczki nie renderuje się (user = null)
  - Middleware przekierowuje do `/login` jeśli sesja wygasła
  - Logowanie błędu do konsoli (development)

### Błąd nawigacji

- **Scenariusz**: Nieprawidłowa ścieżka w nawigacji
- **Obsługa**: 
  - Next.js automatycznie obsługuje 404 dla nieprawidłowych ścieżek
  - Walidacja `href` w komponentach nawigacji (tylko dozwolone sekcje)

### Błąd renderowania nawigacji responsywnej

- **Scenariusz**: Problem z CSS media queries lub breakpoint
- **Obsługa**: 
  - Fallback: Desktop navigation zawsze widoczna (bezpieczniejsza opcja)
  - Testowanie na różnych urządzeniach i rozdzielczościach

## 11. Kroki implementacji

1. **Utworzenie struktury komponentów nawigacji**
   - Utworzenie `src/components/navigation/top-navigation.tsx` (Client Component)
   - Utworzenie `src/components/navigation/bottom-navigation.tsx` (Client Component)
   - Utworzenie `src/components/navigation/quick-start-button.tsx` (Client Component)
   - Utworzenie `src/components/navigation/user-menu.tsx` (Client Component)
   - Utworzenie `src/components/navigation/navigation-items.ts` (stałe danych nawigacji)

2. **Implementacja TopNavigation (desktop)**
   - Integracja z shadcn/ui Tabs
   - Implementacja logo i linków
   - Integracja QuickStartButton
   - Integracja UserMenu
   - Dodanie wyróżnienia aktywnej sekcji przez `usePathname()`
   - Dodanie ARIA labels i keyboard navigation

3. **Implementacja BottomNavigation (mobile)**
   - Implementacja ikon nawigacyjnych z etykietami
   - Integracja QuickStartButton jako FAB
   - Dodanie wyróżnienia aktywnej sekcji
   - Dodanie ARIA labels i keyboard navigation
   - Stylowanie fixed bottom position

4. **Implementacja QuickStartButton**
   - Implementacja wariantu FAB (mobile)
   - Implementacja wariantu button (desktop)
   - Auto-detection breakpoint lub przez props
   - Dodanie ikony play i etykiety
   - Integracja z routing Next.js

5. **Implementacja UserMenu**
   - Integracja z shadcn/ui DropdownMenu
   - Pobieranie danych użytkowniczki (Server Component wrapper)
   - Implementacja opcji wylogowania
   - Obsługa błędów wylogowania
   - Dodanie ARIA labels

6. **Utworzenie komponentu FeaturesOverview**
   - Utworzenie `src/components/home/features-overview.tsx` (Server Component)
   - Utworzenie `src/components/home/feature-card.tsx` (Server Component)
   - Definicja danych funkcji aplikacji
   - Implementacja grid layout responsywnego

7. **Aktualizacja strony głównej (`src/app/page.tsx`)**
   - Zachowanie istniejącego Hero i Footer
   - Integracja TopNavigation (desktop, w header)
   - Zastąpienie sekcji "Planned features" przez FeaturesOverview
   - Integracja BottomNavigation (mobile, na dole strony)
   - Dodanie MainLayout wrapper (jeśli potrzebny)

8. **Aktualizacja root layout (`src/app/layout.tsx`)**
   - Sprawdzenie czy MainLayout jest potrzebny jako wrapper
   - Integracja nawigacji w layout (jeśli ma być globalna)
   - Upewnienie się, że Toaster jest dostępny

9. **Dodanie typów**
   - Definicja `NavigationSection` w `src/types.ts` lub lokalnie
   - Definicja `NavigationItem` w komponencie nawigacji
   - Definicja `Feature` w komponencie FeaturesOverview

10. **Stylowanie i responsywność**
    - Dodanie Tailwind classes dla breakpointów
    - Stylowanie fixed position dla nawigacji
    - Stylowanie FAB na mobile
    - Testowanie na różnych rozdzielczościach

11. **Dodanie ikon**
    - Wybór biblioteki ikon (lucide-react lub inna)
    - Dodanie ikon dla każdej sekcji nawigacji
    - Dodanie ikon dla funkcji aplikacji (opcjonalnie)

12. **Testowanie i dostępność**
    - Testowanie keyboard navigation
    - Testowanie ARIA labels z screen readerem
    - Testowanie responsywności na różnych urządzeniach
    - Testowanie wylogowania i obsługi błędów

13. **Integracja z middleware**
    - Upewnienie się, że middleware sprawdza autoryzację
    - Testowanie przekierowania niezalogowanych użytkowników
    - Testowanie zachowania sesji po odświeżeniu

14. **Optymalizacja i finał**
    - Sprawdzenie performance (Server Components)
    - Sprawdzenie SEO (metadata)
    - Finalne testy E2E
    - Dokumentacja komponentów
