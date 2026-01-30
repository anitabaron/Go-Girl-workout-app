# Analiza TOP 5 komponentów o największej złożoności (LOC)

**Wykluczono:** `workout-session-assistant.tsx` (1246 LOC) – zgodnie z wymaganiami.

**Referencja technologiczna:** `.ai/tech-stack.md` – Next.js 16, React 19, TypeScript 5, Tailwind 4, shadcn/ui, Supabase.

---

## TOP 5 plików (bez workout-session-assistant.tsx)

| #   | Ścieżka                                                                 | LOC | Potencjalna złożoność                                      |
| --- | ----------------------------------------------------------------------- | --- | ---------------------------------------------------------- |
| 1   | `src/components/exercises/form/exercise-form-fields.tsx`                | 309 | Wysoka – powtarzalność, wiele pól                          |
| 2   | `src/components/workout-sessions/workout-session-card.tsx`              | 303 | Wysoka – logika biznesowa + UI, API w komponencie          |
| 3   | `src/components/workout-sessions/assistant/exercise-execution-form.tsx` | 295 | Średnia–wysoka – stan, obliczenia, wiele odpowiedzialności |
| 4   | `src/components/workout-plans/form/planned-params-editor.tsx`           | 261 | Średnia – powtarzalność pól                                |
| 5   | `src/components/ui/dropdown-menu.tsx`                                   | 257 | Niska – komponent shadcn/ui (Radix)                        |

---

## 1. `exercise-form-fields.tsx` (309 LOC)

### Obecna struktura

- Jeden duży komponent z ~12 polami formularza
- Powtarzalny wzorzec: `FormField` + `Input`/`Select`/`Textarea` + `onChange`/`onBlur` + aria-\* + `data-test-id`
- Ręczne mapowanie każdego pola

### Kierunki refaktoryzacji

#### A) **Konfiguracja pól (Configuration-driven form)**

Zdefiniuj tablicę konfiguracji pól zamiast powielać JSX:

```tsx
const EXERCISE_FIELD_CONFIG: FieldConfig[] = [
  { key: "title", label: "Tytuł", type: "text", required: true },
  { key: "type", label: "Typ", type: "select", options: exerciseTypeValues },
  { key: "part", label: "Partia", type: "select", options: exercisePartValues },
  // ...
];
```

**Argumentacja:** Zmniejsza LOC o ~40–50%, ułatwia dodawanie pól i utrzymanie. Wzorzec typowy dla formularzy React (np. react-hook-form + schema).

#### B) **Wydzielenie subkomponentów**

- `ExerciseMetadataFields` (tytuł, typ, partia, poziom, szczegóły)
- `ExerciseMetricsFields` (reps/duration, series)
- `ExerciseRestFields` (rest_in_between, rest_after_series, estimated_set_time)

**Argumentacja:** Zgodne z Single Responsibility Principle. Łatwiejsze testowanie (Vitest + RTL) i ponowne użycie.

#### C) **Wspólny komponent `FormNumberInput`**

Wiele pól to `Input type="number"` z tym samym wzorcem. Wspólny wrapper:

```tsx
<FormNumberInput
  id="reps"
  label="Powtórzenia"
  value={fields.reps}
  onChange={(v) => onChange("reps", v)}
  onBlur={() => onBlur("reps")}
  error={errors.reps}
  min={1}
  disabled={disabled}
  data-test-id="exercise-form-reps"
/>
```

**Argumentacja:** DRY, mniej powtórzeń, spójne zachowanie i dostępność (aria-\*).

---

## 2. `workout-session-card.tsx` (303 LOC)

### Obecna struktura

- Komponent karty sesji z logiką: formatowanie dat, obliczanie czasu, obsługa anulowania, nawigacja
- `handleCancel` – ~60 linii z API, obsługą błędów i toastami
- Dwa dialogi: Delete i Cancel (AlertDialog)

### Kierunki refaktoryzacji

#### A) **Wydzielenie hooka `useCancelSession`**

Przenieś logikę anulowania do hooka:

```tsx
// hooks/use-cancel-session.ts
export function useCancelSession(sessionId: string) {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);

  const cancel = useCallback(async () => {
    setIsCancelling(true);
    try {
      const response = await fetch(`/api/workout-sessions/${sessionId}/status`, {...});
      if (!response.ok) { /* obsługa błędów */ return; }
      toast.success("Sesja została anulowana");
      router.refresh();
    } catch (error) { /* ... */ }
    finally { setIsCancelling(false); }
  }, [sessionId]);

  return { cancel, isCancelling };
}
```

**Argumentacja:** Separacja logiki biznesowej od UI. Łatwiejsze testowanie (Vitest) i ponowne użycie w innych widokach.

#### B) **Wydzielenie `formatSessionDuration`**

Obliczanie `duration` (~35 linii) przenieś do `lib/utils/session-format.ts`:

```ts
export function formatSessionDuration(session: SessionSummaryDTO): string { ... }
```

**Argumentacja:** Czysta funkcja, łatwa do testów jednostkowych. Zgodne z zasadą „pure functions for logic”.

#### C) **Komponent `CancelSessionDialog`**

AlertDialog z anulowaniem sesji wydziel do osobnego komponentu:

```tsx
<CancelSessionDialog
  open={isCancelDialogOpen}
  onOpenChange={setIsCancelDialogOpen}
  sessionId={session.id}
  onCancelled={() => router.refresh()}
/>
```

**Argumentacja:** Mniejszy `WorkoutSessionCard`, czytelniejszy JSX, możliwość użycia dialogu w innych miejscach.

#### D) **Server Actions (Next.js)**

Zamiast `fetch` w komponencie – Server Action:

```ts
// app/actions/workout-sessions.ts
"use server";
export async function cancelSession(sessionId: string) { ... }
```

**Argumentacja:** Zgodne z Next.js App Router, mniej kodu po stronie klienta, lepsze typowanie.

---

## 3. `exercise-execution-form.tsx` (295 LOC)

### Obecna struktura

- Stan formularza (`formData`), `calculateActuals`, `summaryValues`
- Obsługa serii: add/update/remove, checkbox skip
- Sekcja podsumowania (4 pola read-only)
- Błędy formularza

### Kierunki refaktoryzacji

#### A) **Hook `useExerciseExecutionForm`**

Przenieś stan i logikę do hooka:

```tsx
// hooks/use-exercise-execution-form.ts
export function useExerciseExecutionForm(exercise: SessionExerciseDTO, onChange: (data: ExerciseFormData) => void) {
  const [formData, setFormData] = useState(...);
  const calculateActuals = useCallback(...);
  const updateFormData = useCallback(...);
  const handleSetAdd = useCallback(...);
  // ...
  return { formData, summaryValues, handlers, errors };
}
```

**Argumentacja:** Komponent skupia się na renderze. Łatwiejsze testowanie logiki bez React Testing Library.

#### B) **Komponent `ExecutionSummaryDisplay`**

Sekcja z 4 polami (liczba serii, suma powtórzeń, czas, odpoczynek) jako osobny komponent:

```tsx
<ExecutionSummaryDisplay
  values={summaryValues}
  showDuration={!!exercise.planned_duration_seconds}
/>
```

**Argumentacja:** Mniejszy główny komponent, możliwość reużycia w innych widokach (np. podgląd przed zapisem).

#### C) **Wspólny `SummaryField`**

Powtarzający się blok label + div z wartością:

```tsx
<SummaryField label="Liczba serii" value={summaryValues.count_sets} />
```

**Argumentacja:** DRY, spójny wygląd i zachowanie.

#### D) **Checkbox z shadcn/ui**

Zamiast natywnego `<input type="checkbox">` użyj `Checkbox` z `@/components/ui/checkbox`:

**Argumentacja:** Spójność z resztą UI (shadcn), lepsza dostępność i stylowanie.

---

## 4. `planned-params-editor.tsx` (261 LOC)

### Obecna struktura

- 6 pól numerycznych z podobnym wzorcem: label + Input + komunikat błędu
- `handleNumberChange` – wspólna obsługa
- Dużo `useId()` dla aria-describedby

### Kierunki refaktoryzacji

#### A) **Komponent `PlannedParamField`**

Wspólny wrapper dla pola:

```tsx
type PlannedParamFieldProps = {
  id: string;
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  error?: string;
  disabled?: boolean;
  min?: number;
  step?: number;
  placeholder?: string;
  "data-test-id"?: string;
};

function PlannedParamField({ ... }: PlannedParamFieldProps) {
  const inputId = useId();
  const errorId = useId();
  return (
    <div>
      <label htmlFor={inputId}>...</label>
      <Input ... />
      {error && <p id={errorId}>...</p>}
    </div>
  );
}
```

**Argumentacja:** Redukcja powtórzeń o ~70%, spójne aria-\* i obsługa błędów.

#### B) **Konfiguracja pól**

Tablica konfiguracji zamiast powielania JSX:

```tsx
const PLANNED_PARAMS_CONFIG = [
  { key: "planned_sets", label: "Serie", min: 1 },
  {
    key: "planned_reps",
    label: "Powtórzenia",
    min: 1,
    conditional: (p) => p.planned_reps,
  },
  {
    key: "planned_duration_seconds",
    label: "Czas (s)",
    min: 1,
    conditional: (p) => p.planned_duration_seconds,
  },
  // ...
];
```

**Argumentacja:** Łatwe dodawanie/zmiana pól, mniej kodu.

#### C) **Wykorzystanie `FormField`**

Jeśli `FormField` z `@/components/ui/form-field` pasuje semantycznie – użyj go zamiast własnego layoutu label+Input+error.

**Argumentacja:** Spójność z `exercise-form-fields.tsx` i innymi formularzami.

---

## 5. `dropdown-menu.tsx` (257 LOC)

### Kontekst

Komponent shadcn/ui oparty na Radix UI. Zawiera wiele subkomponentów (Root, Trigger, Content, Item, CheckboxItem, RadioGroup, Sub, itd.).

### Kierunki refaktoryzacji

#### A) **Brak refaktoryzacji strukturalnej (zalecane)**

shadcn/ui dostarcza komponenty „copy-paste” – są częścią projektu i zwykle nie są refaktoryzowane wewnętrznie. Zmiany mogą utrudnić aktualizacje z upstream.

**Argumentacja:** Zgodne z filozofią shadcn – komponenty są pod kontrolą projektu, ale ich struktura jest ustalona.

#### B) **Ewentualne rozdzielenie na pliki (opcjonalnie)**

Jeśli zespół woli mniejsze pliki, można rozbić na np.:

- `dropdown-menu.tsx` – Root, Trigger, Content, Portal
- `dropdown-menu-items.tsx` – Item, CheckboxItem, RadioItem, Label, Separator
- `dropdown-menu-sub.tsx` – Sub, SubTrigger, SubContent

**Argumentacja:** Mniejsze pliki, ale więcej importów. Wymaga zmiany struktury eksportów.

#### C) **Wrapery biznesowe**

Zamiast modyfikować `dropdown-menu.tsx`, twórz komponenty biznesowe korzystające z niego:

```tsx
// components/workout-sessions/session-card-menu.tsx
export function SessionCardMenu({ session, onEdit, onDelete }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>...</DropdownMenuTrigger>
      <DropdownMenuContent>...</DropdownMenuContent>
    </DropdownMenu>
  );
}
```

**Argumentacja:** Zachowanie oryginalnego komponentu UI, logika biznesowa w osobnym miejscu.

---

## Podsumowanie priorytetów

| Plik                          | Priorytet | Główny kierunek                                                      |
| ----------------------------- | --------- | -------------------------------------------------------------------- |
| `exercise-form-fields.tsx`    | Wysoki    | Konfiguracja pól + `FormNumberInput`                                 |
| `workout-session-card.tsx`    | Wysoki    | `useCancelSession` + `formatSessionDuration` + `CancelSessionDialog` |
| `exercise-execution-form.tsx` | Średni    | `useExerciseExecutionForm` + `ExecutionSummaryDisplay`               |
| `planned-params-editor.tsx`   | Średni    | `PlannedParamField` + konfiguracja                                   |
| `dropdown-menu.tsx`           | Niski     | Bez zmian lub wrapper biznesowy                                      |

---

## Zgodność z tech-stack

- **React 19** – wykorzystanie `use` (gdy stabilne), `useCallback`/`useMemo` tam gdzie sensowne
- **TypeScript 5** – typowanie konfiguracji pól, hooków i props
- **Vitest + RTL** – wydzielone hooki i funkcje czyste łatwiej testować jednostkowo
- **shadcn/ui** – spójne użycie `FormField`, `Checkbox`, `Input` w formularzach
- **Next.js** – Server Actions zamiast `fetch` w komponentach gdzie to możliwe
