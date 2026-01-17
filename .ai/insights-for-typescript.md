# Ogólne wytyczne TypeScript - Przykłady dobrych i złych praktyk

## Przegląd

Ten plik zawiera przykłady kodu ilustrujące dobre i złe praktyki wyciągnięte z analizy błędów kompilacji TypeScript.

---

## 1. Obsługa null i undefined

### ❌ Błędne - brak sprawdzania null/undefined

```typescript
function getValueBad(obj: { value?: number }): number {
  return obj.value || 0; // Problem: || zwróci 0 też dla 0
}
```

### ✅ Poprawne - użyj nullish coalescing

```typescript
function getValueGood(obj: { value?: number }): number {
  return obj.value ?? 0; // Zwróci 0 tylko gdy value jest null/undefined
}
```

### ❌ Błędne - brak optional chaining

```typescript
function getNameBad(user: { profile?: { name?: string } }): string {
  return user.profile.name; // Błąd jeśli profile jest undefined
}
```

### ✅ Poprawne - użyj optional chaining

```typescript
function getNameGood(user: { profile?: { name?: string } }): string {
  return user?.profile?.name ?? "Unknown";
}
```

### ❌ Błędne - brak walidacji

```typescript
function processDataBad(data: { title?: string }): void {
  const normalized = data.title.toLowerCase(); // Błąd jeśli title jest undefined
}
```

### ✅ Poprawne - dodaj walidację

```typescript
function processDataGood(data: { title?: string }): void {
  if (!data.title) {
    throw new Error("Title is required");
  }
  const normalized = data.title.toLowerCase();
}
```

---

## 2. Type assertions i type narrowing

### ❌ Błędne - nadmierne użycie type assertions

```typescript
function getValueFromObjectBad(obj: Record<string, unknown>, key: string): string {
  return obj[key as keyof typeof obj] as string; // Niebezpieczne
}
```

### ✅ Poprawne - użyj type narrowing

```typescript
function getValueFromObjectGood(
  obj: { name: string; id: number },
  key: "name" | "id"
): string | number {
  return key === "name" ? obj.name : obj.id;
}
```

### ❌ Błędne - brak type guard

```typescript
function handleErrorBad(error: unknown): void {
  console.log(error.message); // Błąd - error może nie być Error
}
```

### ✅ Poprawne - użyj type guard

```typescript
function isError(value: unknown): value is Error {
  return value instanceof Error;
}

function handleErrorGood(error: unknown): void {
  if (isError(error)) {
    console.log(error.message); // TypeScript wie, że error jest Error
  }
}
```

### ❌ Błędne - użycie as any

```typescript
function processDataAnyBad(data: unknown): void {
  const obj = data as any; // Utracone bezpieczeństwo typów
  obj.anything = "value";
}
```

### ✅ Poprawne - sprawdź typ przed użyciem

```typescript
function processDataAnyGood(data: unknown): void {
  if (typeof data === "object" && data !== null && "field" in data) {
    const obj = data as { field: string };
    console.log(obj.field);
  }
}
```

---

## 3. Precyzyjne typy zamiast ogólnych

### ❌ Błędne - zbyt ogólne typy

```typescript
interface FormBad {
  errors: Record<string, string>; // Nie wiemy jakie pola są dozwolone
  values: Record<string, unknown>;
}
```

### ✅ Poprawne - precyzyjne typy

```typescript
interface FormGood {
  errors: {
    email?: string;
    password?: string;
    name?: string;
  };
  values: {
    email: string;
    password: string;
    name: string;
  };
}
```

### ❌ Błędne - string zamiast union type

```typescript
function setPartBad(part: string | null): void {
  // Może być dowolny string
}
```

### ✅ Poprawne - union type

```typescript
type ExercisePart = "Legs" | "Core" | "Back" | "Arms" | "Chest";

function setPartGood(part: ExercisePart | null): void {
  // Tylko dozwolone wartości
}
```

### ✅ Dobre - type utility dla powtarzających się wzorców

```typescript
type FormErrors<T> = {
  [K in keyof T]?: string;
};

type LoginForm = {
  email: string;
  password: string;
};

type LoginFormErrors = FormErrors<LoginForm>;
// Równoważne z: { email?: string; password?: string; }
```

---

## 4. Type safety w warstwach danych

### ❌ Błędne - type assertion zamiast narrowing

```typescript
interface Row {
  id: number;
  name: string;
  created_at: string;
}

function getSortValueBad(row: Row, sort: string): string | number {
  return row[sort as keyof Row] as string | number; // Niebezpieczne
}
```

### ✅ Poprawne - explicit type narrowing

```typescript
function getSortValueGood(row: Row, sort: "id" | "name" | "created_at"): string | number {
  switch (sort) {
    case "id":
      return row.id;
    case "name":
      return row.name;
    case "created_at":
      return row.created_at;
  }
}
```

### ❌ Błędne - brak walidacji

```typescript
function updateEntityBad(data: Partial<{ title: string }>): void {
  const normalized = data.title!.toLowerCase(); // Non-null assertion - niebezpieczne
}
```

### ✅ Poprawne - dodaj walidację

```typescript
function updateEntityGood(data: Partial<{ title: string }>): void {
  if (!data.title) {
    throw new Error("Title is required");
  }
  const normalized = data.title.toLowerCase();
}
```

### ✅ Dobre - type aliases dla powtarzających się typów

```typescript
type SelectResult<T> = Omit<T, "user_id" | "internal_id">;

function mapToDTO<T extends { user_id: string }>(
  row: T | SelectResult<T>
): Omit<T, "user_id"> {
  const { user_id, ...rest } = row as T;
  return rest;
}
```

---

## 5. Obsługa enum i union types

### ❌ Błędne - nieużywane wartości w mapowaniu

```typescript
type Part = "Arms" | "Back" | "Chest" | "Core";

const labelsBad: Record<string, string> = {
  Arms: "Ręce",
  Back: "Plecy",
  Shoulders: "Barki", // Nie istnieje w Part
  Cardio: "Cardio", // Nie istnieje w Part
};
```

### ✅ Poprawne - tylko istniejące wartości

```typescript
const labelsGood: Record<Part, string> = {
  Arms: "Ręce",
  Back: "Plecy",
  Chest: "Klatka",
  Core: "Brzuch",
};
```

### ✅ Dobre - exhaustive switch z type checking

```typescript
function getPartLabel(part: Part): string {
  switch (part) {
    case "Arms":
      return "Ręce";
    case "Back":
      return "Plecy";
    case "Chest":
      return "Klatka";
    case "Core":
      return "Brzuch";
    // TypeScript sprawdzi, czy wszystkie przypadki są obsłużone
  }
}
```

---

## 6. Poprawne użycie bibliotek walidacji (Zod)

### ❌ Błędne - stare API (errorMap dla enum)

```typescript
import { z } from "zod";

const schemaBad = z.enum(["value1", "value2"], {
  errorMap: () => ({ message: "Invalid value" }), // Stare API
});
```

### ✅ Poprawne - nowe API (message dla enum)

```typescript
const schemaGood = z.enum(["value1", "value2"], {
  message: "Invalid value", // Nowe API
});
```

### ✅ Dobre - kompleksowy przykład z walidacją

```typescript
const exerciseSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120, "Title too long"),
  type: z.enum(["Strength", "Cardio", "Flexibility"], {
    message: "Type is required",
  }),
  part: z.enum(["Legs", "Core", "Back", "Arms", "Chest"], {
    message: "Part is required",
  }),
  level: z
    .string()
    .transform((val) => {
      if (!val || val.trim() === "" || val === "none") return null;
      if (["Beginner", "Intermediate", "Advanced"].includes(val)) {
        return val;
      }
      return null;
    })
    .nullable(),
});
```

---

## 7. Obsługa błędów i unknown

### ❌ Błędne - brak sprawdzania typu błędu

```typescript
function handleErrorUnknownBad(error: unknown): void {
  console.log(error.message); // Błąd - error może nie być Error
}
```

### ✅ Poprawne - sprawdź typ przed użyciem

```typescript
function handleErrorUnknownGood(error: unknown): void {
  if (error instanceof Error) {
    console.log(error.message);
  } else {
    console.log("Unknown error:", error);
  }
}
```

### ✅ Dobre - type guard dla błędów

```typescript
function isErrorWithMessage(error: unknown): error is { message: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  );
}

function handleErrorWithGuard(error: unknown): void {
  if (isErrorWithMessage(error)) {
    console.log(error.message); // TypeScript wie, że message istnieje
  }
}
```

---

## 8. Generics i reużywalne typy

### ✅ Dobre - generics dla reużywalnych funkcji

```typescript
function getValue<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

// Użycie:
const user = { name: "John", age: 30 };
const name = getValue(user, "name"); // string
const age = getValue(user, "age"); // number
```

### ✅ Dobre - conditional types

```typescript
type NonNullable<T> = T extends null | undefined ? never : T;

function processNonNull<T>(value: NonNullable<T>): void {
  // value nie może być null ani undefined
}
```

### ✅ Dobre - mapped types dla transformacji

```typescript
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

type Partial<T> = {
  [P in keyof T]?: T[P];
};
```

---

## 9. Spójność nazewnictwa i parametrów

### ❌ Błędne - niezgodność nazw parametrów

```typescript
interface CallFunctionBad {
  p_order: number; // W bazie to p_exercise_order
}
```

### ✅ Poprawne - zgodność nazw

```typescript
interface CallFunctionGood {
  p_exercise_order: number; // Zgodne z bazą danych
}
```

### ✅ Dobre - użyj type z bazy danych

```typescript
// type FunctionParams = Database["public"]["Functions"]["call_save_exercise"]["Args"];
```

---

## 10. Regex i stringi

### ❌ Błędne - String.raw może nie działać poprawnie

```typescript
const patternBad = String.raw`/(.*\.(?:svg|png)$).*)`;
```

### ✅ Poprawne - podwójne escapowanie w stringu

```typescript
const patternGood = "/(.*\\.(?:svg|png)$).*)";
```

### ✅ Dobre - RegExp constructor dla złożonych wzorców

```typescript
const complexPattern = new RegExp(
  `((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)`
);
```

---

## 11. Type narrowing w praktyce

### ✅ Dobre - discriminated unions

```typescript
type Success<T> = {
  status: "success";
  data: T;
};

type Error = {
  status: "error";
  message: string;
};

type Result<T> = Success<T> | Error;

function handleResult<T>(result: Result<T>): T {
  if (result.status === "success") {
    return result.data; // TypeScript wie, że to Success<T>
  } else {
    throw new Error(result.message); // TypeScript wie, że to Error
  }
}
```

### ✅ Dobre - type predicates

```typescript
function isString(value: unknown): value is string {
  return typeof value === "string";
}

function processValue(value: unknown): void {
  if (isString(value)) {
    console.log(value.toUpperCase()); // TypeScript wie, że value jest string
  }
}
```

---

## 12. Best practices - Podsumowanie

### Zasady ogólne

1. **Zawsze sprawdzaj null/undefined przed użyciem**
   - Używaj `??` zamiast `||`
   - Używaj `?.` dla zagnieżdżonych właściwości
   - Dodawaj walidację w serwisach

2. **Preferuj type narrowing nad type assertions**
   - Używaj type guards
   - Używaj `instanceof` i `typeof`
   - Unikaj `as any`

3. **Używaj precyzyjnych typów**
   - Union types zamiast `string`
   - Explicit interfaces zamiast `Record<string, string>`
   - Type utilities dla powtarzających się wzorców

4. **Sprawdzaj dokumentację bibliotek**
   - API może się zmieniać między wersjami
   - Używaj najnowszej wersji API

5. **Utrzymuj spójność nazewnictwa**
   - Sprawdzaj nazwy między warstwami
   - Używaj type z bazy danych gdy to możliwe

6. **Usuwaj nieużywane wartości**
   - Tylko wartości istniejące w typie
   - Type-safe mapowania
   - Exhaustiveness checking

---

**Data ostatniej aktualizacji:** 2026-01-17  
**Status:** Aktywne  
**Zastosowanie:** Uniwersalne dla projektów TypeScript
