# Plan: Zestawy (scope) w planach treningowych

## Kontekst

- **Obecnie:** Ćwiczenia w planie to płaska lista; kolejność to `section_type` + `section_order`. W sesji każda pozycja to jedno ćwiczenie.
- **Docelowo:** Można dodawać "zestaw" – kilka ćwiczeń w bloku z jednym `section_order`, powtarzany N razy (np. 3× zestaw: A → B → C).

**Pojedyncze ćwiczenia:** Tak jak dziś – przycisk "Dodaj ćwiczenie" dodaje ćwiczenia **poza zestawem** (`scope_id` i `in_scope_nr` = null). W jednym planie można mieszać: np. Ćw. 1 → Zestaw (A→B→C)×3 → Ćw. 2. Nic nie znika z obecnego flow.

**Konwencja (main) vs legacy:** W projekcie są stare i nowe widoki. Wszystkie zmiany UI i nawigacja muszą być powiązane z **`src/app/(app)/(main)`** (formularze, listy, widok szczegółów planu, asystent sesji). Nie wiązać nowej funkcjonalności z `(legacy)` ani z komponentami wyłącznie z `legacy`.

## Model danych (bez rozwalania DB)

Dodanie **trzech kolumn** w `workout_plan_exercises`:

| Kolumna              | Typ               | Znaczenie                                                                                                                                    |
| -------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `scope_id`           | UUID, nullable    | Wspólny identyfikator zestawu. Wszystkie ćwiczenia w jednym zestawie mają ten sam `scope_id`. Ćwiczenia poza zestawem: `null`.               |
| `in_scope_nr`        | integer, nullable | Kolejność w zestawie (1, 2, 3…). Poza zestawem: `null`.                                                                                      |
| `scope_repeat_count` | integer, nullable | Liczba powtórzeń zestawu (np. 3). Sensowne tylko gdy `in_scope_nr` nie jest null; można trzymać na każdym wierszu zestawu (ta sama wartość). |

- **Unikalność:** Obecny constraint `UNIQUE(plan_id, section_type, section_order)` nie pozwala na wiele wierszy z tym samym `section_order`. Trzeba go zastąpić przez `UNIQUE(plan_id, section_type, section_order, in_scope_nr)` – w PostgreSQL wiele `NULL` w `in_scope_nr` (sprawdzić dokumentację); jeśli wiele NULL jest uznawane za duplikat, użyć partial unique index: dla `in_scope_nr IS NULL` unikalne (plan_id, section_type, section_order), dla `in_scope_nr IS NOT NULL` unikalne (plan_id, section_type, section_order, scope_id, in_scope_nr). W praktyce: **drop** starego `UNIQUE(plan_id, section_type, section_order)` i dodać nowy – w jednym "slocie" (section_order) może być albo jeden wiersz z `in_scope_nr = NULL`, albo wiele wierszy z `in_scope_nr = 1, 2, 3...` (zestaw).

---

## Przepływ danych

```mermaid
flowchart LR
  subgraph plan [Plan treningowy]
    A[Ćw. 1]
    B[Zestaw: Ćw. A B C x3]
    C[Ćw. 2]
  end
  subgraph session [Sesja - flattened]
    D[Ćw. 1]
    E1[Ćw. A]
    E2[Ćw. B]
    E3[Ćw. C]
    F1[Ćw. A]
    F2[Ćw. B]
    F3[Ćw. C]
    G1[Ćw. A]
    G2[Ćw. B]
    G3[Ćw. C]
    H[Ćw. 2]
  end
  plan --> session
```

W sesji **nie** dodajemy kolumn scope – lista ćwiczeń sesji pozostaje płaska; zestaw jest "rozwijany" przy starcie sesji (createSessionSnapshots).

---

## 1. Baza danych

- **Migracja Supabase:** W tabeli `workout_plan_exercises` dodać kolumny:
  - `scope_id` UUID NULL
  - `in_scope_nr` integer NULL (CHECK: NULL lub > 0)
  - `scope_repeat_count` integer NULL (CHECK: NULL lub >= 1)
- **Constraint:** Usunąć stary `UNIQUE(plan_id, section_type, section_order)` i dodać `UNIQUE(plan_id, section_type, section_order, in_scope_nr)` (w PostgreSQL wiele NULL w unikalności – sprawdzić dokumentację; jeśli wiele NULL jest uznawane za duplikat, użyć np. partial unique index).
- **Typy:** Zaktualizować `src/db/database.types.ts` (albo wygenerować z Supabase).

---

## 2. Typy i API (backend)

- **src/types.ts** (WorkoutPlanExerciseInput, WorkoutPlanExerciseDTO): dodać pola `scope_id?: string | null`, `in_scope_nr?: number | null`, `scope_repeat_count?: number | null`.
- **src/types/workout-plan-form.ts:** W `WorkoutPlanExerciseItemState` dodać te same pola; w `dtoToFormState` i `exerciseDtoToItemState` mapować je z DTO.
- **Walidacja** (src/lib/validation/workout-plans.ts, src/lib/validation/workout-plan-form.ts): schemat ćwiczenia rozszerzyć o opcjonalne `scope_id`, `in_scope_nr`, `scope_repeat_count`; reguły: jeśli `in_scope_nr` podane, to `scope_id` wymagane i `scope_repeat_count` opcjonalne (np. domyślnie 1); w ramach tego samego `scope_id` unikalne `in_scope_nr`.
- **Normalizacja section_order:** W src/lib/validation/workout-plan-form.ts funkcja `normalizeSectionOrders` musi działać na "slotach": slot = jedno ćwiczenie (in_scope_nr == null) albo cały zestaw (wszystkie wiersze z tym samym scope_id). Sortowanie: section_type → section_order → in_scope_nr (null przed 1,2,3). Przypisywanie section_order: każdy slot dostaje kolejny numer; w obrębie zestawu wszystkie wiersze mają ten sam section_order.
- **Walidacja duplikatów:** Obecna `validateSectionOrderDuplicates` w workout-plan-form traktuje duplikat (section_type, section_order) jako błąd. Należy ją zmienić: dopuścić wiele ćwiczeń z tym samym (section_type, section_order) tylko gdy należą do zestawu (scope_id + in_scope_nr); w jednym slocie może być albo jedno ćwiczenie bez scope, albo zestaw (wszystkie z tym samym scope_id).
- **Repozytorium / serwis planów:** Przy zapisie (create/update) przekazywać i zapisywać nowe kolumny; przy odczycie zwracać je w DTO. Listowanie ćwiczeń planu: sortowanie `section_type`, `section_order`, `in_scope_nr`.

---

## 3. Formularz planu (frontend)

- **Przycisk "Add scope":** Obok "Add exercise" w src/components/workout-plans/form/workout-plan-form.tsx dodać przycisk otwierający dialog dodawania scope.
- **AddScopeDialog (nowy komponent):** Analogiczny do AddExerciseDialog – wybór kilku ćwiczeń z biblioteki, wybór sekcji (Warm-up / Main / Cool-down) i **liczba powtórzeń scope** (np. pole liczbowe, domyślnie 3). Na potwierdzenie: wygenerować jeden `scope_id` (crypto.randomUUID()), dla każdego wybranego ćwiczenia dodać wiersz z tym samym `scope_id`, `in_scope_nr` = 1, 2, 3…, `section_order` = następny wolny slot w wybranej sekcji, `scope_repeat_count` = wybrana liczba.
- **Hook use-workout-plan-form:** W src/hooks/use-workout-plan-form.ts dodać `handleAddScope(exercises: ExerciseDTO[], sectionType, repeatCount)` – wstawia wiele pozycji z jednym scope_id i in_scope_nr 1..n, section_order = następny slot w sekcji.
- **Lista ćwiczeń – sloty i scope:** W WorkoutPlanExercisesList grupować ćwiczenia po "slocie": (section_type, section_order), przy czym scope = wszystkie z tym samym scope_id. Render:
  - **Slot bez scope:** jeden wiersz jak dziś (WorkoutPlanExerciseItem).
  - **Slot-scope:** obramowany blok (np. border, padding), nagłówek typu "Scope × 3" z polem do edycji `scope_repeat_count` i przyciskiem remove scope; wewnątrz lista ćwiczeń wg `in_scope_nr` z możliwością usunięcia pojedynczego z scope lub przesunięcia w górę/dół wewnątrz scope.
- **Kolejność slotów (move up/down):** W `handleMoveExercise` traktować "jednostkę" jako cały slot: pojedyncze ćwiczenie albo cały scope. Przesunięcie w górę/dół zmienia `section_order` całego slotu (wszystkich wierszy w slocie); po ruchu wywołać normalizację section_order (np. w formularzu lub przy zapisie).
- **Usuwanie:** Usunięcie ostatniego ćwiczenia ze scope = usunięcie scope. Usunięcie ćwiczenia ze środka scope = zmniejszenie liczby pozycji i przenumerowanie `in_scope_nr`.

Klucze do stabilnego renderu: slot można identyfikować przez `scope_id ?? \`single-${exercise.id ?? index}\``; wewnątrz zestawu key np. `scope_id` + `in_scope_nr`.

---

## 4. Start sesji – rozwijanie zestawów

- W src/services/workout-sessions.ts w `createSessionSnapshots`:
  - Sortować plan: section_type → section_order → in_scope_nr (null na koniec lub na początek – spójnie z formularzem).
  - Przed zmapowaniem do jednej płaskiej listy: **rozwinąć zestawy**. Dla każdego zestawu (scope_id + scope_repeat_count): powtórzyć ciąg ćwiczeń (po in_scope_nr) `scope_repeat_count` razy; każda powtórka to kolejne pozycje w sesji.
  - Wynik: jedna tablica snapshotów z kolejnymi `exercise_order` 1, 2, 3… Bez zmian w tabeli `workout_session_exercises` – nadal tylko exercise_order, bez scope.

Efekt: asystent sesji i historia sesji działają na płaskiej liście; użytkownik w trakcie treningu widzi po prostu kolejne ćwiczenia (w tym wielokrotnie te same z zestawu).

---

## 5. Asystent sesji i historia

- **Asystent:** Brak zmian w logice nawigacji (next/previous po indeksie w tablicy ćwiczeń). Lista ćwiczeń sesji jest już "rozłożona" (np. A, B, C, A, B, C, A, B, C), więc kursor i zapis działają jak dotąd.
- **Zapis wykonania:** Nie zapisywać osobno "która runda zestawu"; każde wystąpienie ćwiczenia w sesji to osobna pozycja z własnymi seriami/reps. Do rekordów (PR) i statystyk traktujemy każde wystąpienie jak zwykłe ćwiczenie (obecna logika wystarczy).
- **Historia sesji:** Wyświetlanie listy ćwiczeń po `exercise_order` – pozostaje płaska lista. Opcjonalnie w przyszłości: grupowanie wizualne "Scope 1", "Scope 2" – bez zmiany modelu sesji, tylko warstwa prezentacji (można pominąć w pierwszej iteracji).

---

## 6. Miejsca do zmiany (skrót)

| Warstwa              | Pliki / obszary |
| -------------------- | --------------- |
| DB                   | Migracja: kolumny + nowy unique constraint |
| Typy                 | types.ts, types/workout-plan-form.ts, database.types.ts |
| Walidacja            | workout-plans.ts, workout-plan-form.ts (normalizeSectionOrders, validateSectionOrderDuplicates, schematy) |
| Repo/serwis planów   | repositories/workout-plans.ts, services/workout-plans.ts (CRUD, buildExercisesToInsert, import) |
| Formularz            | workout-plan-form.tsx (przycisk Add scope), nowy AddScopeDialog, use-workout-plan-form.ts (handleAddScope, handleMoveExercise po slotach, handleRemove), workout-plan-exercises-list.tsx (grupowanie po slotach, blok scope), workout-plan-exercise-item (obsługa in_scope_nr w scope) |
| Sesja                | services/workout-sessions.ts (createSessionSnapshots – rozwijanie scope) |
| Widok planu (detail) | Opcjonalnie: wyświetlanie scope jako blok "Scope × N" w komponentach używanych przez **(main)** – np. WorkoutPlanDetailContent, WorkoutPlansExercisesListM3 w `(main)/_components`. Nie modyfikować widoków w `(legacy)`. |
| **Testy**            | Testy jednostkowe i ewentualnie integracyjne uwzględniające scope: walidacja, normalizacja slotów, rozwijanie zestawów w sesji, formularz (dodawanie/edycja scope) – patrz sekcja 8.5. |

---

## 7. Kolejność wdrożenia (sugerowana)

1. Migracja DB + typy (backend i frontend).
2. Walidacja i normalizacja section_order (slot = pojedyncze lub zestaw); zapis/odczyt w repo i serwisie planów.
3. Formularz: AddScopeDialog, handleAddScope, grupowanie listy po slotach, ruch/usuwanie po slotach.
4. createSessionSnapshots – rozwijanie zestawów przy starcie sesji.
5. Opcjonalnie: widok szczegółów planu (scope jako jeden blok) i ewentualne dopracowanie historii (grupowanie wizualne). **Na końcu:** obsługa scope w imporcie planów JSON.
6. **Testy:** Dopisać (lub rozszerzyć istniejące) testy uwzględniające scope – walidacja, normalizacja, rozwijanie zestawów w sesji, formularz – patrz sekcja 8.5.

---

## 8. Kroki implementacji (Do zrobienia)

Wszystkie zmiany dotyczą **stron i komponentów z `src/app/(app)/(main)`** (oraz współdzielonych warstw: typy, walidacja, eksport). Nie wiązać z `(legacy)`.

---

### 8.0 Widoczność scope w UI (wymagane miejsca)

Scope (zestaw ćwiczeń) ma być **widoczny** w trzech miejscach aplikacji (main):

| Miejsce | Komponent / strona | Wymaganie |
|--------|---------------------|-----------|
| **Widok detali planu** | `(main)/_components/WorkoutPlanDetailContent.tsx` – lista ćwiczeń planu | Ćwiczenia zgrupowane po scope; każdy zestaw jako blok „Scope × N” z listą ćwiczeń wewnątrz (nie płaska lista). |
| **Formularz tworzenia/edycji planu** | `(main)/_components/WorkoutPlansExercisesListM3.tsx` w `WorkoutPlanFormM3` | Grupowanie po slotach; slot-scope w wspólnej ramce z nagłówkiem „Scope × N”, edycja repeat count, ruch/usuwanie – patrz 8.1. |
| **Karta planu na liście** | `(main)/_ui/M3WorkoutPlanCard.tsx` w `WorkoutPlansListM3` | Na karcie (list/preview) planu scope ma być widoczny – np. zamiast płaskiej listy ćwiczeń: pojedyncze ćwiczenia + bloki „Scope × N” (skrótowo: liczba ćwiczeń w scope lub etykieta „Scope” przy zestawie). |

**Kroki implementacji dla każdego miejsca:**

- **Widok detali planu:** W `WorkoutPlanDetailContent` sortować ćwiczenia jak dotąd (section_type → section_order → in_scope_nr), następnie grupować po slocie (section_type + section_order; slot-scope = wiersze z tym samym scope_id). Render: pojedyncze ćwiczenie – jedna karta/pozycja; slot-scope – jeden blok z ramką, nagłówek „Scope × N”, wewnątrz lista ćwiczeń wg in_scope_nr. Użyć tej samej stylistyki ramki co w formularzu (m3.css).
- **Formularz tworzenia/edycji:** Patrz 8.1 poniżej.
- **Karta planu na liście:** W `M3WorkoutPlanCard` w podglądzie ćwiczeń (preview) nie pokazywać płaskiej listy wszystkich pozycji – pojedyncze ćwiczenia + dla każdego scope jeden wpis typu „Scope × N” (np. „3 exercises × 2”) lub zwięzła etykieta „Scope”, tak aby na liście planów było widać, że plan zawiera zestawy.

---

### 8.1 Wyróżnienie graficzne scope na UI (formularz)

- **Cel:** Scope (zestaw ćwiczeń) ma być wizualnie odróżniony od pojedynczych ćwiczeń – wspólna obejmująca ramka zgodna ze stylistyką M3.
- **Miejsce:** `src/app/(app)/(main)/_components/WorkoutPlansExercisesListM3.tsx` oraz ewentualnie `WorkoutPlanExerciseItemM3.tsx`.
- **Kroki:**
  1. W `WorkoutPlansExercisesListM3` grupować ćwiczenia po **slocie**: (section_type, section_order), przy czym slot-scope = wszystkie wiersze z tym samym `scope_id` (i `in_scope_nr` != null).
  2. Dla slotu bez scope: renderować pojedynczy `WorkoutPlanExerciseItemM3` jak dotąd (bez dodatkowej ramki).
  3. Dla slotu-scope: otoczyć grupę ćwiczeń wspólnym kontenerem z ramką – np. `border`, `padding`, zaokrąglone rogi (klasy M3 / `m3.css`), tło wyróżniające (np. `var(--m3-surface-container)` lub delikatny outline). W nagłówku bloku: etykieta typu "Scope × N" + opcjonalnie pole edycji `scope_repeat_count` i przycisk "Remove scope".
  4. Wewnątrz bloku scope: lista `WorkoutPlanExerciseItemM3` wg `in_scope_nr`; ruch/usuwanie w górę/dół w obrębie scope (bez zmiany `section_order` całego slotu).
  5. Klucze do renderu: slot bez scope → `single-${exercise.id ?? index}`; slot-scope → `scope-${scope_id}`. Wewnątrz scope: key np. `scope-${scope_id}-${in_scope_nr}`.
- **Stylistyka:** Użyć tokenów z `m3.css` (np. `--m3-outline-variant`, `--m3-surface-container`) i ewentualnie `rounded-lg` / `rounded-xl` spójnie z innymi kartami w (main).

---

### 8.2 Dialog dodawania scope – zaokrąglone rogi i spójność z designem

- **Cel:** Add scope dialog ma mieć zaokrąglone rogi i nie odbiegać od reszty UI (M3).
- **Miejsce:** `src/app/(app)/(main)/_components/AddScopeDialogM3.tsx` – używa `DialogContent` z `@/components/ui/dialog`.
- **Kroki:**
  1. Sprawdzić `src/components/ui/dialog.tsx`: `DialogContent` ma domyślnie `rounded-lg`. W (main) dialogi mogą być nadpisywane przez kontekst `.ui-m3` lub globalne style – upewnić się, że dla M3 używane są większe zaokrąglenia jeśli tak ma reszta (np. `rounded-2xl` w m3.css dla kart/dialogów).
  2. W `AddScopeDialogM3` dodać do `DialogContent` klasę nadpisującą zaokrąglenia, np. `className="... rounded-2xl"` (albo wartość z m3.css, np. `rounded-[var(--m3-shape-extra-large)]` jeśli zdefiniowane), tak aby dialog wyglądał spójnie z `AddExerciseDialogM3` i innymi dialogami w (main).
  3. Porównać wizualnie z `AddExerciseDialogM3` – ten sam border, shadow, padding, żeby oba dialogi były spójne.

---

### 8.3 Edycja planu ze scope – przycisk Save ma zapisywać zmiany

- **Cel:** Plan utworzony ze scope po wejściu w edycję i kliknięciu Save ma faktycznie wykonywać update (nie nic nie robić, bez błędu).
- **Przyczyna:** W `src/hooks/use-workout-plan-form.ts` funkcja `formStateToFormValues` mapuje stan formularza (z `dtoToFormState`) na wartości do react-hook-form **bez pól scope**. W trybie edit `defaultValues` są ustawiane z tej mapy, więc `scope_id`, `in_scope_nr`, `scope_repeat_count` trafiają do formularza jako `undefined`. Przy submicie wysyłane są więc ćwiczenia bez scope (lub z null), a formularz może nie uznawać zmian za "dirty" w oczekiwany sposób, albo backend dostaje niepełne dane.
- **Kroki:**
  1. W `use-workout-plan-form.ts` w `formStateToFormValues` dodać do mapowania każdego ćwiczenia pola: `scope_id`, `in_scope_nr`, `scope_repeat_count` (wartości z `ex.scope_id`, `ex.in_scope_nr`, `ex.scope_repeat_count` – zachować null/undefined spójnie z `WorkoutPlanFormValues`).
  2. Upewnić się, że `dtoToFormState` zwraca te pola (już zwraca – `types/workout-plan-form.ts`). Po poprawce `formStateToFormValues` formularz w trybie edit będzie miał poprawne defaultValues ze scope.
  3. Przetestować: plan ze scope → Edytuj → (opcjonalnie zmiana nazwy lub repeat count) → Save → plan ma być zaktualizowany i przekierowanie na listę; w bazie ćwiczenia muszą zachować `scope_id` / `in_scope_nr` / `scope_repeat_count`.

---

### 8.4 Eksport JSON planu z uwzględnieniem scope

- **Cel:** Eksport planu do JSON (przycisk w widoku szczegółów planu) ma zawierać dane scope, tak aby po imporcie pliku plan odtwarzał zestawy (scope × N).
- **Miejsca:**  
  - `src/lib/workout-plans/plan-to-import-format.ts` – funkcja `workoutPlanToImportFormat` i `exerciseToImportFormat`;  
  - `src/lib/validation/workout-plans.ts` – schemat importu `workoutPlanExerciseImportSchema` / `workoutPlanImportSchema` musi dopuszczać (i ewentualnie wymagać przy scope) pola scope.
- **Kroki:**
  1. W `exerciseToImportFormat`: do obiektu eksportowanego ćwiczenia dodać pola `scope_id`, `in_scope_nr`, `scope_repeat_count` (wartości z `ex.scope_id`, `ex.in_scope_nr`, `ex.scope_repeat_count` – null gdy brak scope).
  2. W schemacie importu w `workout-plans.ts`: upewnić się, że `workoutPlanExerciseImportSchema` zawiera opcjonalne (nullable) pola `scope_id`, `in_scope_nr`, `scope_repeat_count` (zgodnie z regułami scope: jeśli `in_scope_nr` podane, to `scope_id` wymagane itd. – patrz istniejące walidatory scope w tym pliku).
  3. W logice importu planu (serwis/repo): przy wstawianiu ćwiczeń z pliku przekazywać te trzy pola do bazy, żeby zaimportowany plan miał te same zestawy co wyeksportowany.
  4. Przetestować: plan ze scope → Export JSON → Import tego pliku → nowy plan ma identyczną strukturę scope (te same scope_id grupy, in_scope_nr, scope_repeat_count).

---

### 8.5 Testy uwzględniające scope

- **Cel:** Mieć pokrycie testami logiki związanej ze scope, tak aby zmiany w walidacji, normalizacji i rozwijaniu zestawów były zabezpieczone przed regresją.
- **Zakres:** Testy jednostkowe (oraz ewentualnie integracyjne) dla warstw, w których scope ma wpływ na zachowanie.
- **Kroki / obszary do przetestowania:**
  1. **Walidacja (workout-plans, workout-plan-form):**
     - Schemat ćwiczenia: poprawne przyjmowanie `scope_id`, `in_scope_nr`, `scope_repeat_count`; błąd gdy `in_scope_nr` podane bez `scope_id`; unikalność `in_scope_nr` w obrębie tego samego `scope_id`.
     - `validateSectionOrderDuplicates`: dopuszczenie wielu ćwiczeń z tym samym (section_type, section_order) tylko gdy należą do zestawu (scope_id + in_scope_nr); błąd przy duplikacie w jednym slocie bez scope.
  2. **Normalizacja section_order (workout-plan-form):**
     - `normalizeSectionOrders`: slot = pojedyncze ćwiczenie (in_scope_nr == null) albo cały zestaw (wszystkie wiersze z tym samym scope_id); sortowanie section_type → section_order → in_scope_nr; przypisywanie kolejnych section_order per slot; w obrębie zestawu ten sam section_order dla wszystkich wierszy.
  3. **Sesja – rozwijanie zestawów:**
     - `createSessionSnapshots`: plan z mixem pojedynczych ćwiczeń i zestawów (scope × N) daje płaską listę snapshotów w poprawnej kolejności; każdy zestaw rozwinięty N razy (A, B, C, A, B, C, …); exercise_order ciągły 1, 2, 3…
  4. **Formularz / hook (opcjonalnie, jeśli są testy formularza):**
     - `handleAddScope`: wstawienie wielu pozycji z jednym scope_id, in_scope_nr 1..n, section_order = następny slot.
     - Ruch/usuwanie po slotach: przesunięcie slotu zmienia section_order całego slotu (wszystkich wierszy w zestawie); usunięcie ostatniego ćwiczenia ze scope usuwa scope.
  5. **Import/eksport (po realizacji 8.4):** Eksport planu ze scope zawiera pola scope w JSON; import z tymi polami odtwarza zestawy w bazie.
- **Miejsca testów:** Istniejące pliki testowe przy walidacji (`workout-plans.test.ts`, `workout-plan-form.test.ts` jeśli są), przy serwisie sesji i przy hooku formularza; w razie braku – dodać nowe pliki w tym samym katalogu co kod źródłowy (np. `*.test.ts` obok modułu).
- **Kolejność:** Testy walidacji i normalizacji można pisać równolegle z punktami 2–3 wdrożenia; testy createSessionSnapshots po punkcie 4; testy formularza/importu – po realizacji odpowiednich kroków.

---

## Uwagi

- **Nazewnictwo w UI:** W (main) wszystko jest po angielsku – w UI używać "scope" (np. "Add scope", "Scope × 3"); w kodzie/DB: `scope_id`, `in_scope_nr`, `scope_repeat_count`.
- **Import planów (JSON):** Docelowo import ma obsługiwać scope (scope_id / in_scope_nr / scope_repeat_count w pliku). Wdrożyć to na końcu; w pierwszej iteracji przy imporcie ustawiać brak scope (null). **Po realizacji pkt 8.4** import będzie pełny dla scope.
- **Edycja planów:** Istniejące plany zostają jak są; przy odczycie/edycji ćwiczenia bez scope mają `scope_id`/`in_scope_nr`/`scope_repeat_count` = null. Można im potem dodać scope (nowe zestawy) lub zostawić pojedyncze ćwiczenia.
- **Gdzie robić zmiany UI:** Komponenty formularza w `src/components/` są współdzielone; strony i nawigacja – tylko te pod **`src/app/(app)/(main)`**. Przy dodawaniu linków, routów czy odniesień do widoków planu/sesji używać wyłącznie ścieżek i komponentów z (main).
