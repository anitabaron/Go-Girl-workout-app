# Podsumowanie planowania architektury UI dla MVP - Go Girl Workout App

<conversation_summary>

<decisions>
1. Główna nawigacja z zakładkami: Biblioteka ćwiczeń, Plany treningowe, Historia sesji, Rekordy (PR), oraz przycisk szybkiego startu sesji. Asystent treningu jako pełnoekranowy widok z możliwością wyjścia.
2. Asystent treningowy: pełnoekranowy widok z dużymi przyciskami nawigacji (next, previous, skip, pause) dostosowanymi do użycia jedną ręką. Duży zegar na górze z największymi sekundami widocznymi z 1,5m, format: "Ćwiczenie XXX Seria 1" + duże sekundy, odliczanie przerwy od 0, suma długości treningu mniejszą wartością poniżej. Timer globalny sesji widoczny na górze. Formularz wprowadzania danych (actual_* i set logs) na tym samym ekranie z możliwością przewijania. Autosave w tle przy każdej akcji (next/pause/skip) z wskaźnikiem zapisu. Automatyczna propozycja wznowienia sesji in_progress.
3. Filtrowanie i sortowanie: podstawowe filtrowanie (part, type, level) i sortowanie (data utworzenia, nazwa) przez dropdowny. Paginacja zgodna z API (limit=20, max=100), uproszczona do "load more" dla małej skali.
4. Walidacja formularzy: dwupoziomowa - po stronie klienta (Zod) i serwera (odpowiedzi API). Komunikaty błędów inline przy polach oraz toast notifications dla błędów globalnych. Specyficzne kody błędów (409, 429) z dedykowanymi komunikatami po polsku. Retry przy błędach sieciowych z zachowaniem danych.
5. Architektura komponentów: listy (ćwiczenia, plany, historia) jako Server Components. Formularze CRUD i asystent sesji jako Client Components z zarządzaniem stanem lokalnym i optymistycznymi aktualizacjami. Szczegóły sesji (read-only) jako Server Components, edycja w sesji in_progress wymaga Client Component.
6. Widok szczegółów sesji: lista ćwiczeń w kolejności z sekcjami "Planowane" i "Wykonane" obok siebie (tryb porównawczy). Set logs jako tabela/lista serii. Różnice między planem a wykonaniem wizualnie wyróżnione. Dla sesji in_progress możliwość edycji przez powrót do asystenta.
7. Logowanie: dedykowany widok logowania z tradycyjnym formularzem email/password (Supabase Auth). Formularz zawiera pola: email (lub username, w zależności od konfiguracji Supabase), password. Obsługa rejestracji nowych użytkowników oraz resetu hasła. Przekierowanie do głównego widoku po zalogowaniu. Middleware chroni wszystkie route'y wymagające autoryzacji. Sprawdzanie stanu sesji po stronie serwera (middleware) i klienta (Client Components).
8. Widok PR: lista ćwiczeń z możliwością rozwijania szczegółów. Dla każdego ćwiczenia wszystkie dostępne typy rekordów (max_reps, max_duration, max_weight) z wartością, datą osiągnięcia i opcjonalnie linkiem do sesji. Filtrowanie po exercise_id lub wszystkie PR użytkowniczki. Sortowanie domyślnie po dacie osiągnięcia (najnowsze pierwsze).
9. Optymistyczne aktualizacje: włączone dla operacji CRUD z rollbackiem przy błędzie. Dla autosave w sesji treningowej szczególnie ważne - natychmiastowa aktualizacja UI, zapis w tle z wskaźnikiem statusu. Przy błędzie zapisu dane pozostają w formularzu z komunikatem błędu.
10. Puste stany: dedykowane puste stany dla każdej listy z ikoną, komunikatem i CTA. Blokady funkcjonalności wizualnie oznaczone (disabled buttons) z tooltipami/komunikatami wyjaśniającymi wymagania.
11. Nawigacja główna: dolny pasek nawigacji (bottom navigation) na mobile z ikonami i etykietami. Na desktopie górny pasek z zakładkami (Tabs z shadcn/ui) lub sidebar. Przycisk "Start treningu" wyróżniony i dostępny z każdego widoku. Asystent pełnoekranowy bez widocznej nawigacji głównej.
12. Zegar w asystencie: osobny, duży komponent na górze ekranu. Największe sekundy widoczne z 1,5m. Format: "Ćwiczenie XXX Seria 1" + duże sekundy. Odliczanie przerwy od 0. Suma długości treningu mniejszą wartością poniżej. Status sesji (w trakcie/pauza) i numer bieżącego ćwiczenia. Zatrzymywanie przy pauzie, wznawianie przy kontynuacji. Wizualna animacja (pulsowanie) gdy sesja aktywna.
13. Formularz w asystencie: zawsze widoczny pod informacjami o bieżącym ćwiczeniu. Set logs jako lista serii z możliwością dodawania i edycji. Każda seria: reps, duration_seconds, weight_kg (zależnie od typu). Walidacja inline z oznaczeniem pól wymaganych. Przycisk "Next" disabled przy nieprzechodzącej walidacji (chyba że skipowane).
14. Zarządzanie stanem: Zustand store dla stanu sesji treningowej (dostęp z różnych miejsc). Store przechowuje: aktualną sesję (id, status, current_position), dane ćwiczeń w sesji, timer state. Lokalny stan w komponencie asystenta tylko dla UI state. Synchronizacja z API przy każdej akcji (next/pause/skip).
15. Loading states: skeleton loaders dla list (Skeleton z shadcn/ui). Spinnery w przyciskach lub toast notifications dla operacji CRUD. Subtelny wskaźnik dla autosave (ikona zapisu w rogu lub zmiana koloru przycisku) bez blokowania interakcji. Progress bar lub modal z postępem dla operacji AI.
16. Lista ćwiczeń w planie: ćwiczenia w kolejności dodania (bez drag-and-drop w MVP). Możliwość usuwania. Wyświetlanie: nazwa, type, part, planned_* parametry. Edycja parametrów inline lub przez kliknięcie.
17. Widok szczegółów ćwiczenia: Sheet (shadcn/ui) wysuwający się z prawej (lub z dołu na mobile) z wszystkimi informacjami i przyciskami akcji (Edycja, Usuń). Edycja w tym samym Sheet z przełączaniem trybów lub w osobnym modal/dialog.
18. Walidacja formularzy: dwupoziomowa - klient (Zod) i serwer (API). Błędy z API mapowane na czytelne komunikaty po polsku, wyświetlane inline. Specyficzne błędy (409) z dedykowanymi komunikatami i sugestią rozwiązania.
19. Integracja AI: planned na późniejszy etap (po wdrożeniu podstawowych CRUD i asystenta sesji). Gdy wdrożone: opcje "Wygeneruj przez AI" i "Zoptymalizuj przez AI" w edytorze planów. Formularz AI w Dialog/Modal z polami: cel, poziom, czas, partie, sprzęt. Podgląd wyniku z możliwością zapisania lub odrzucenia. Licznik pozostałych użyć AI i data resetu limitu.
20. Responsywność: adaptacyjny layout z breakpointami Tailwind (sm: 640px, md: 768px, lg: 1024px). Mobile-first design jako priorytet. Asystent zoptymalizowany pod użycie jedną ręką - duże przyciski na dole, formularz przewijalny. Na desktopie szerszy layout z większą ilością informacji. Nawigacja: bottom navigation na mobile (< 768px), górny pasek/sidebar na desktopie (≥ 768px).
</decisions>

<matched_recommendations>

1. Główna nawigacja z zakładkami dla kluczowych sekcji (Biblioteka ćwiczeń, Plany treningowe, Historia sesji, Rekordy, przycisk szybkiego startu sesji).
2. Asystent treningowy jako pełnoekranowy widok z dużymi przyciskami nawigacji dostosowanymi do użycia jedną ręką na telefonie, z timerem globalnym sesji na górze.
3. Duży zegar w asystencie z największymi sekundami widocznymi z 1,5m, formatem "Ćwiczenie XXX Seria 1" + duże sekundy, odliczaniem przerwy od 0, sumą długości treningu poniżej.
4. Formularz wprowadzania danych zawsze widoczny pod informacjami o bieżącym ćwiczeniu, z set logs jako lista serii z możliwością dodawania i edycji.
5. Autosave w tle przy każdej akcji (next/pause/skip) z wskaźnikiem zapisu, automatyczna propozycja wznowienia sesji in_progress.
6. Podstawowe filtrowanie (part, type, level) i sortowanie przez dropdowny, paginacja zgodna z API.
7. Dwupoziomowa walidacja formularzy (Zod po stronie klienta + odpowiedzi API), komunikaty błędów inline i toast notifications.
8. Architektura komponentów: listy jako Server Components, formularze CRUD i asystent jako Client Components z optymistycznymi aktualizacjami.
9. Widok szczegółów sesji z trybem porównawczym planned vs actual, set logs jako tabela/lista serii.
10. Zustand store dla stanu sesji treningowej z synchronizacją z API.
11. Dolny pasek nawigacji na mobile, górny pasek/sidebar na desktopie, przycisk "Start treningu" wyróżniony.
12. Skeleton loaders dla list, spinnery dla operacji CRUD, subtelny wskaźnik dla autosave.
13. Lista ćwiczeń w planie w kolejności dodania (bez drag-and-drop w MVP), możliwość usuwania i edycji parametrów.
14. Sheet (shadcn/ui) dla widoku szczegółów ćwiczenia z możliwością edycji.
15. Dedykowane puste stany dla każdej listy z ikoną, komunikatem i CTA, blokady funkcjonalności wizualnie oznaczone.
16. Mobile-first design z adaptacyjnym layoutem, asystent zoptymalizowany pod użycie jedną ręką.
    </matched_recommendations>

<ui_architecture_planning_summary>

## Główne wymagania dotyczące architektury UI

### Priorytety projektowe

- **Mobile-first design**: aplikacja używana głównie na smartfonie podczas treningu
- **Prostota i funkcjonalność**: brak rozbudowanej analityki, skupienie na podstawowych przepływach
- **Dostępność**: komponenty shadcn/ui (a11y-first), czytelne komunikaty błędów po polsku
- **Wydajność**: Server Components dla list, Client Components dla interaktywnych elementów, optymistyczne aktualizacje

### Kluczowe widoki i ekrany

#### 1. Widok logowania/rejestracji

- Dedykowany widok z tradycyjnym formularzem email/password (Supabase Auth)
- Formularz zawiera pola: email (lub username), password
- Obsługa rejestracji nowych użytkowników oraz resetu hasła
- Przekierowanie do głównego widoku po zalogowaniu
- Middleware chroni route'y wymagające autoryzacji

#### 2. Główna nawigacja

- **Mobile**: dolny pasek nawigacji (bottom navigation) z ikonami i etykietami
- **Desktop**: górny pasek z zakładkami (Tabs z shadcn/ui) lub sidebar
- Sekcje: Biblioteka ćwiczeń, Plany treningowe, Historia sesji, Rekordy (PR)
- Wyróżniony przycisk "Start treningu" dostępny z każdego widoku

#### 3. Biblioteka ćwiczeń

- Lista ćwiczeń (Server Component) z podstawowym filtrowaniem (part, type, level) i sortowaniem
- Pusty stan z CTA do dodania pierwszego ćwiczenia
- Formularz tworzenia/edycji ćwiczenia (Client Component z walidacją Zod)
- Widok szczegółów w Sheet (shadcn/ui) z możliwością edycji i usunięcia
- Blokada usunięcia z komunikatem, jeśli ćwiczenie ma powiązania

#### 4. Plany treningowe

- Lista planów (Server Component) z filtrowaniem i sortowaniem
- Formularz tworzenia/edycji planu z listą ćwiczeń w kolejności dodania
- Możliwość dodawania/usuwania ćwiczeń, edycji parametrów planned\_\*
- Walidacja: co najmniej jedno ćwiczenie w planie
- Pusty stan z CTA do utworzenia pierwszego planu

#### 5. Asystent treningowy (WorkoutSession)

- **Pełnoekranowy widok** bez widocznej nawigacji głównej
- **Duży zegar na górze**:
  - Format: "Ćwiczenie XXX Seria 1" + największe sekundy widoczne z 1,5m
  - Odliczanie przerwy od 0
  - Suma długości treningu mniejszą wartością poniżej
  - Status sesji (w trakcie/pauza) i numer bieżącego ćwiczenia
  - Wizualna animacja (pulsowanie) gdy sesja aktywna
- **Formularz wprowadzania danych** zawsze widoczny pod informacjami o ćwiczeniu
- **Set logs** jako lista serii z możliwością dodawania i edycji
- **Duże przyciski nawigacji** (next, previous, skip, pause) dostosowane do użycia jedną ręką
- **Autosave w tle** z wskaźnikiem zapisu, bez blokowania interakcji
- Automatyczna propozycja wznowienia sesji in_progress przy wejściu do sekcji

#### 6. Historia sesji

- Lista sesji (Server Component) z filtrowaniem (status, plan_id, data) i sortowaniem
- Widok szczegółów sesji z trybem porównawczym planned vs actual
- Set logs jako tabela/lista serii z wartościami reps/duration/weight
- Różnice między planem a wykonaniem wizualnie wyróżnione
- Dla sesji in_progress możliwość powrotu do asystenta

#### 7. Rekordy (PR)

- Lista ćwiczeń z możliwością rozwijania szczegółów
- Dla każdego ćwiczenia wszystkie dostępne typy rekordów (max_reps, max_duration, max_weight)
- Wyświetlanie: wartość, data osiągnięcia, opcjonalnie link do sesji
- Filtrowanie po exercise_id lub wszystkie PR użytkowniczki
- Sortowanie domyślnie po dacie osiągnięcia (najnowsze pierwsze)

### Strategia integracji z API i zarządzania stanem

#### Zarządzanie stanem

- **Zustand store** dla stanu sesji treningowej (dostęp z różnych miejsc w aplikacji)
- Store przechowuje: aktualną sesję (id, status, current_position), dane ćwiczeń w sesji, timer state
- Lokalny stan w komponencie asystenta tylko dla UI state (np. czy formularz rozwinięty)
- Synchronizacja z API przy każdej akcji (next/pause/skip)

#### Integracja z API

- **Server Components** dla list (fetchowanie danych po stronie serwera)
- **Client Components** dla formularzy CRUD i asystenta sesji
- **Optymistyczne aktualizacje** dla operacji CRUD z rollbackiem przy błędzie
- Dla autosave w sesji: natychmiastowa aktualizacja UI, zapis w tle z wskaźnikiem statusu
- Przy błędzie zapisu: dane pozostają w formularzu z komunikatem błędu

#### Walidacja

- **Dwupoziomowa**: Zod po stronie klienta (natychmiastowa informacja zwrotna) + odpowiedzi API (bezpieczeństwo)
- Komunikaty błędów inline przy polach formularza oraz toast notifications dla błędów globalnych
- Specyficzne kody błędów (409 dla duplikatów, 429 dla limitów) z dedykowanymi komunikatami po polsku
- Retry przy błędach sieciowych z zachowaniem wprowadzonych danych

#### Loading states

- **Skeleton loaders** (Skeleton z shadcn/ui) dla list podczas ładowania
- **Spinnery** w przyciskach lub toast notifications dla operacji CRUD
- **Subtelny wskaźnik** dla autosave (ikona zapisu w rogu lub zmiana koloru przycisku)
- Progress bar lub modal z postępem dla operacji AI (planned na później)

### Kwestie dotyczące responsywności, dostępności i bezpieczeństwa

#### Responsywność

- Adaptacyjny layout z breakpointami Tailwind (sm: 640px, md: 768px, lg: 1024px)
- **Mobile-first design** jako priorytet
- Asystent zoptymalizowany pod użycie jedną ręką: duże przyciski na dole ekranu, formularz przewijalny
- Na desktopie szerszy layout z większą ilością informacji widocznych jednocześnie
- Nawigacja: bottom navigation na mobile (< 768px), górny pasek/sidebar na desktopie (≥ 768px)

#### Dostępność

- Komponenty shadcn/ui (a11y-first) jako baza systemu UI
- Czytelne komunikaty błędów po polsku
- Tooltips/komunikaty wyjaśniające wymagania dla blokad funkcjonalności
- Duże przyciski i czytelne fonty w asystencie treningowym

#### Bezpieczeństwo

- Middleware chroni wszystkie route'y wymagające autoryzacji
- Sprawdzanie stanu sesji po stronie serwera (middleware) i klienta (Client Components)
- Frontend nie zakłada zaufania do danych po stronie klienta
- RLS na poziomie bazy zapewnia izolację danych niezależnie od UI

### Obsługa stanów pustych i blokad funkcjonalności

- Dedykowane puste stany dla każdej listy z ikoną, komunikatem wyjaśniającym i CTA prowadzącym do dodania pierwszego elementu
- Blokady funkcjonalności wizualnie oznaczone (disabled buttons) z tooltipami/komunikatami wyjaśniającymi wymagania
- Przykłady: "Dodaj co najmniej jedno ćwiczenie, aby użyć AI" (planned), "Utwórz plan treningowy, aby rozpocząć sesję"
- Walidacja po stronie API, ale UI proaktywnie informuje użytkowniczkę o wymaganiach

</ui_architecture_planning_summary>

<unresolved_issues>

1. **Integracja AI**: Funkcjonalność generowania i optymalizacji planów przez AI jest zaplanowana na późniejszy etap (po wdrożeniu podstawowych CRUD i asystenta sesji). Wymaga dodatkowego planowania UI dla formularza AI, podglądu wyników i zarządzania limitami użycia.

2. **Szczegóły implementacji zegara**: Wymagane doprecyzowanie technicznych szczegółów implementacji dużego zegara (biblioteka do timera, format wyświetlania, synchronizacja z backendem, obsługa pauzy/wznowienia).

3. **Strategia cache'owania**: Nie określono strategii cache'owania danych po stronie klienta (React Query, SWR, czy własne rozwiązanie) dla optymalizacji wydajności i redukcji liczby zapytań do API.

4. **Obsługa offline**: Nie określono, czy aplikacja powinna obsługiwać tryb offline dla asystenta treningowego (Service Workers, cache'owanie danych sesji lokalnie).

5. **Szczegóły design systemu**: Wymagane doprecyzowanie szczegółów design systemu (kolory brandowe już zdefiniowane w globals.css, ale brakuje szczegółów dotyczących typografii, spacing, komponentów customowych).

6. **Testowanie UI**: Nie określono strategii testowania interfejsu użytkownika (testy jednostkowe komponentów, testy integracyjne przepływów użytkownika, testy E2E).
   </unresolved_issues>

</conversation_summary>
