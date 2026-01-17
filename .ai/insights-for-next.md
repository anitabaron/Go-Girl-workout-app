# Ogólne wytyczne programowania TypeScript i Next.js

## Przegląd

Niniejszy dokument zawiera uniwersalne wytyczne i best practices wyciągnięte z analizy błędów kompilacji TypeScript. Zasady te powinny być stosowane w każdym projekcie TypeScript/Next.js, aby uniknąć typowych błędów wykrywanych dopiero podczas builda produkcyjnego.

---

## 1. Sprawdzanie typów TypeScript przed commitem

### Zasada ogólna
**Zawsze sprawdzaj typy TypeScript przed commitem. Nie polegaj tylko na dev mode.**

### Problem
Błędy typów TypeScript są często wykrywane dopiero podczas builda produkcyjnego (`next build`), a nie podczas developmentu (`next dev`). Dev mode może ignorować niektóre błędy typów dla szybszego developmentu.

### Rozwiązanie

1. **Dodaj skrypt type-check do package.json**
   ```json
   {
     "scripts": {
       "type-check": "tsc --noEmit",
       "type-check:watch": "tsc --noEmit --watch"
     }
   }
   ```

2. **Skonfiguruj pre-commit hook**
   - Dodaj sprawdzanie typów do `.husky/pre-commit`
   - Blokuj commit, jeśli są błędy typów

3. **Używaj watch mode podczas developmentu**
   - Uruchom `type-check:watch` w osobnym terminalu
   - Automatycznie wykrywa błędy typów podczas pisania kodu

### Best Practices

- ✅ Uruchamiaj `type-check` przed każdym commitem
- ✅ Nie polegaj tylko na `next dev` - może ignorować błędy typów
- ✅ `next build` jest bardziej restrykcyjny - zawsze sprawdzaj przed commitem
- ✅ Dodaj type-check do CI/CD pipeline jako pierwszy krok

### Checklist
- [ ] Skrypt `type-check` jest w `package.json`
- [ ] Pre-commit hook sprawdza typy
- [ ] CI/CD pipeline zawiera type-check
- [ ] Build przechodzi przed commitem

---

## 2. Obsługa wartości null i undefined

### Zasada ogólna
**Zawsze sprawdzaj wartości nullable przed użyciem. Używaj nullish coalescing i optional chaining.**

### Problem
Brak sprawdzania wartości `null` i `undefined` przed użyciem powoduje błędy typu podczas builda, nawet jeśli kod działa w dev mode.

### Rozwiązanie

1. **Używaj nullish coalescing operator (`??`)**
   ```typescript
   // ❌ Błędne
   const value = nullableValue || defaultValue;
   
   // ✅ Poprawne
   const value = nullableValue ?? defaultValue;
   ```

2. **Używaj optional chaining (`?.`) dla zagnieżdżonych właściwości**
   ```typescript
   // ❌ Błędne
   const name = user.profile.name;
   
   // ✅ Poprawne
   const name = user?.profile?.name ?? "Unknown";
   ```

3. **Dodawaj walidację w serwisach**
   ```typescript
   if (!requiredValue) {
     throw new Error("Value is required");
   }
   ```

### Best Practices

- ✅ Zawsze sprawdzaj wartości nullable przed użyciem
- ✅ Używaj `??` zamiast `||` dla wartości domyślnych (różnica w obsłudze `0`, `""`, `false`)
- ✅ Używaj optional chaining dla zagnieżdżonych właściwości
- ✅ Dodawaj walidację w serwisach przed użyciem wartości

### Checklist
- [ ] Wszystkie wartości nullable są sprawdzane przed użyciem
- [ ] Używasz `??` dla wartości domyślnych
- [ ] Używasz optional chaining (`?.`) dla zagnieżdżonych właściwości
- [ ] Walidacja w serwisach sprawdza wymagane pola

---

## 3. Poprawne użycie bibliotek walidacji (Zod, Yup, etc.)

### Zasada ogólna
**Zawsze sprawdzaj dokumentację biblioteki walidacji przed użyciem. API może się zmieniać między wersjami.**

### Problem
Nieprawidłowe użycie API bibliotek walidacji, szczególnie dla enumów i komunikatów błędów.

### Przykład dla Zod

```typescript
// ❌ Błędne (stare API)
z.enum(values, { 
  errorMap: () => ({ message: "Error message" }) 
})

// ✅ Poprawne (nowe API)
z.enum(values, { 
  message: "Error message" 
})
```

### Best Practices

- ✅ Sprawdzaj dokumentację biblioteki przed użyciem
- ✅ Używaj najnowszej wersji API
- ✅ Dla enumów używaj `message` zamiast `errorMap` (w Zod)
- ✅ `errorMap` tylko dla zaawansowanych przypadków z niestandardową logiką
- ✅ Komunikaty błędów powinny być czytelne dla użytkownika

### Checklist
- [ ] Sprawdziłeś dokumentację biblioteki walidacji
- [ ] Używasz najnowszej wersji API
- [ ] Komunikaty błędów są czytelne dla użytkownika

---

## 4. Type assertions i type narrowing

### Zasada ogólna
**Preferuj type narrowing nad type assertions. Używaj type assertions tylko gdy jesteś pewien typu.**

### Problem
Nadmierne użycie type assertions (`as`) zamiast type narrowing powoduje utratę bezpieczeństwa typów.

### Rozwiązanie

1. **Używaj type narrowing zamiast assertions**
   ```typescript
   // ❌ Błędne
   const value = obj[key as keyof Obj] as string;
   
   // ✅ Poprawne
   const value = key === "name" ? obj.name : obj.id;
   ```

2. **Używaj type guards dla bezpieczeństwa**
   ```typescript
   // ✅ Type guard
   function isError(value: unknown): value is Error {
     return value instanceof Error;
   }
   
   if (isError(error)) {
     // TypeScript wie, że error jest typu Error
     handleError(error);
   }
   ```

3. **Type assertions tylko gdy jesteś pewien**
   ```typescript
   // ✅ OK - wiesz, że error jest Error
   handleError(error as Error);
   
   // ❌ Błędne - nie jesteś pewien
   handleError(error as any);
   ```

### Best Practices

- ✅ Preferuj type narrowing nad type assertions
- ✅ Używaj type guards dla bezpieczeństwa
- ✅ Type assertions tylko gdy jesteś 100% pewien typu
- ✅ Unikaj `as any` i `as unknown` bez uzasadnienia
- ✅ Używaj `instanceof` i `typeof` dla type narrowing

### Checklist
- [ ] Type assertions są używane tylko gdy jesteś pewien typu
- [ ] Preferuj type narrowing nad assertions
- [ ] Używasz type guards dla bezpieczeństwa
- [ ] Unikasz `as any` bez uzasadnienia

---

## 5. Rezerwowane nazwy w frameworkach

### Zasada ogólna
**Zawsze sprawdzaj dokumentację frameworka przed nazywaniem plików i funkcji. Niektóre nazwy są zarezerwowane.**

### Problem
Używanie nazw zarezerwowanych przez framework (np. `middleware` w Next.js) powoduje konflikty i błędy kompilacji.

### Przykład dla Next.js

```typescript
// ❌ Błędne - middleware jest zarezerwowane
// src/middleware.ts
export async function middleware(request: NextRequest) {
  // ...
}

// ✅ Poprawne - użyj innej nazwy
// src/proxy.ts
export async function proxy(request: NextRequest) {
  // ...
}
```

### Rezerwowane nazwy w Next.js

- `middleware` - zarezerwowane dla `middleware.ts` w root
- `layout` - zarezerwowane dla `layout.tsx`
- `page` - zarezerwowane dla `page.tsx`
- `loading` - zarezerwowane dla `loading.tsx`
- `error` - zarezerwowane dla `error.tsx`
- `not-found` - zarezerwowane dla `not-found.tsx`

### Best Practices

- ✅ Sprawdzaj dokumentację frameworka przed nazywaniem plików
- ✅ Unikaj rezerwowanych nazw
- ✅ Używaj opisowych nazw zamiast generycznych
- ✅ Sprawdzaj konwencje nazewnictwa frameworka

### Checklist
- [ ] Sprawdziłeś, czy nazwa nie jest zarezerwowana przez framework
- [ ] Używasz opisowych nazw zamiast generycznych
- [ ] Pliki są w odpowiednim miejscu zgodnie z konwencjami frameworka

---

## 6. Escapowanie w regex i stringach

### Zasada ogólna
**Dla regex w stringach używaj podwójnego escapowania. String.raw może nie działać poprawnie dla wszystkich przypadków.**

### Problem
Nieprawidłowe escapowanie znaków specjalnych w regex w stringach TypeScript powoduje błędy kompilacji lub nieprawidłowe działanie regex.

### Rozwiązanie

```typescript
// ❌ Błędne - String.raw może nie działać poprawnie
String.raw`/(.*\.(?:svg|png)$).*)`

// ✅ Poprawne - użyj zwykłego stringa z podwójnym escapowaniem
"/(.*\\.(?:svg|png)$).*)"

// ✅ Alternatywnie - użyj RegExp constructor
const pattern = new RegExp(
  `((?!_next/static|.*\\.(?:svg|png|jpg)$).*)`
);
```

### Best Practices

- ✅ Dla regex w stringach używaj podwójnego escapowania (`\\.` zamiast `\.`)
- ✅ String.raw może nie działać poprawnie dla wszystkich przypadków
- ✅ Rozważ użycie RegExp constructor dla złożonych wzorców
- ✅ Testuj regex przed użyciem w produkcji

### Checklist
- [ ] Regex w stringach ma poprawne escapowanie
- [ ] Testuj regex przed użyciem
- [ ] Rozważ RegExp constructor dla złożonych wzorców

---

## 7. Type safety w warstwach danych (repositories, services)

### Zasada ogólna
**Używaj explicit type narrowing zamiast type assertions. Definiuj precyzyjne typy dla parametrów funkcji.**

### Problem
Brak odpowiednich typów w warstwach danych powoduje błędy podczas builda i utratę bezpieczeństwa typów.

### Rozwiązanie

1. **Używaj explicit type narrowing**
   ```typescript
   // ❌ Błędne
   value: obj[key as keyof Obj] as string | number
   
   // ✅ Poprawne
   const value = key === "created_at" 
     ? obj.created_at 
     : key === "name" 
       ? obj.name 
       : obj.created_at; // fallback
   ```

2. **Definiuj precyzyjne typy dla parametrów**
   ```typescript
   // ❌ Błędne - zbyt ogólne
   part?: string | null;
   
   // ✅ Poprawne - precyzyjne
   part?: "Legs" | "Core" | "Back" | "Arms" | "Chest" | null;
   ```

3. **Używaj type aliases dla powtarzających się typów**
   ```typescript
   type SelectResult = Omit<Row, "user_id">;
   
   function mapToDTO(row: Row | SelectResult): DTO {
     // ...
   }
   ```

4. **Dodawaj walidację przed użyciem**
   ```typescript
   if (!requiredValue) {
     throw new Error("Value is required");
   }
   ```

### Best Practices

- ✅ Używaj explicit type narrowing zamiast type assertions
- ✅ Typy parametrów powinny być precyzyjne (nie `string`, ale konkretne wartości)
- ✅ Używaj type aliases dla powtarzających się typów
- ✅ Dodawaj walidację w serwisach przed użyciem wartości
- ✅ Unikaj `any` i zbyt ogólnych typów

### Checklist
- [ ] Używasz explicit type narrowing zamiast type assertions
- [ ] Typy parametrów są precyzyjne
- [ ] Używasz type aliases dla powtarzających się typów
- [ ] Walidacja w serwisach sprawdza wymagane pola

---

## 8. Spójność nazewnictwa między warstwami

### Zasada ogólna
**Utrzymuj spójność nazewnictwa między warstwami (API, baza danych, kod). Sprawdzaj nazwy przed użyciem.**

### Problem
Niezgodność nazw parametrów między API, bazą danych a kodem powoduje błędy runtime i kompilacji.

### Rozwiązanie

1. **Sprawdzaj nazwy parametrów w definicjach**
   ```typescript
   // ❌ Błędne - niezgodność nazw
   p_order: params.p_order,
   // Parametr w bazie to p_exercise_order
   
   // ✅ Poprawne - zgodność nazw
   p_exercise_order: params.p_exercise_order,
   ```

2. **Używaj find/replace dla globalnych zmian**
   - Jeśli zmieniasz nazwę w bazie, zmień wszędzie
   - Użyj IDE find/replace dla globalnych zmian

3. **Dokumentuj zmiany nazw w commitach**
   - Ułatwia śledzenie zmian
   - Pomaga w code review

### Best Practices

- ✅ Sprawdzaj nazwy parametrów w migracjach SQL przed użyciem
- ✅ Utrzymuj spójność nazewnictwa między warstwami
- ✅ Używaj find/replace dla globalnych zmian nazw
- ✅ Dokumentuj zmiany nazw w commitach
- ✅ Używaj TypeScript do weryfikacji nazw (generuj typy z bazy)

### Checklist
- [ ] Nazwy parametrów w kodzie zgadzają się z bazą danych
- [ ] Sprawdziłeś migracje SQL przed użyciem parametrów
- [ ] Używasz find/replace dla globalnych zmian nazw
- [ ] Zmiany nazw są udokumentowane w commitach

---

## 9. Usuwanie nieużywanych wartości enum i typów

### Zasada ogólna
**Używaj tylko wartości, które istnieją w typie. Usuwaj nieużywane wartości z mapowań i switch/case.**

### Problem
Nieużywane wartości w switch/case lub mapowaniach powodują błędy kompilacji TypeScript.

### Rozwiązanie

1. **Używaj tylko wartości, które istnieją w typie**
   ```typescript
   // ❌ Błędne - nieużywane wartości
   const labels = {
     Arms: "Ręce",
     Shoulders: "Barki", // Nie istnieje w ExercisePart
     Cardio: "Cardio", // Nie istnieje w ExercisePart
   };
   
   // ✅ Poprawne - tylko istniejące wartości
   const labels = {
     Arms: "Ręce",
     Back: "Plecy",
   };
   ```

2. **Używaj type-safe mapowań**
   ```typescript
   // ✅ TypeScript wymusi wszystkie wartości
   const labels: Record<ExercisePart, string> = {
     Arms: "Ręce",
     Back: "Plecy",
     // TypeScript sprawdzi, czy wszystkie wartości są obsłużone
   };
   ```

3. **Sprawdzaj typy przed użyciem w switch/case**
   ```typescript
   switch (part) {
     case "Arms": return "Ręce";
     case "Back": return "Plecy";
     // TypeScript sprawdzi, czy wszystkie przypadki są obsłużone
   }
   ```

### Best Practices

- ✅ Sprawdzaj definicję typu przed użyciem wartości
- ✅ Usuwaj nieużywane wartości z mapowań
- ✅ Używaj type-safe mapowań (`Record<Type, Value>`)
- ✅ TypeScript sprawdzi exhaustiveness w switch/case

### Checklist
- [ ] Wszystkie wartości w mapowaniach istnieją w typie
- [ ] Używasz type-safe mapowań gdy to możliwe
- [ ] Usunąłeś nieużywane wartości enum
- [ ] TypeScript sprawdza exhaustiveness w switch/case

---

## 10. Precyzyjne typy zamiast ogólnych

### Zasada ogólna
**Używaj precyzyjnych typów zamiast ogólnych (`Record<string, string>`, `any`, etc.). Definiuj typy explicite.**

### Problem
Zbyt ogólne typy (np. `Record<string, string>`) powodują utratę bezpieczeństwa typów i utrudniają refaktoryzację.

### Rozwiązanie

1. **Używaj precyzyjnych typów**
   ```typescript
   // ❌ Błędne - zbyt ogólne
   errors: Record<string, string>;
   
   // ✅ Poprawne - precyzyjne
   errors: {
     name?: string;
     description?: string;
     part?: string;
   };
   ```

2. **Definiuj typy dla formularzy explicite**
   ```typescript
   type UpdateCommand = Partial<
     Pick<TableUpdate, "name" | "description" | "part">
   > & {
     items?: ItemInput[];
   };
   ```

3. **Używaj type utilities dla powtarzających się wzorców**
   ```typescript
   type FormErrors<T> = {
     [K in keyof T]?: string;
   };
   
   type LoginFormErrors = FormErrors<{
     email: string;
     password: string;
   }>;
   ```

### Best Practices

- ✅ Używaj precyzyjnych typów zamiast ogólnych
- ✅ Definiuj typy dla formularzy explicite
- ✅ Używaj type utilities dla powtarzających się wzorców
- ✅ Unikaj `any`, `unknown` bez uzasadnienia
- ✅ Używaj generics dla reużywalnych typów

### Checklist
- [ ] Typy są precyzyjne (nie `Record<string, string>`)
- [ ] Typy formularzy są zdefiniowane explicite
- [ ] Używasz type utilities dla powtarzających się wzorców
- [ ] Unikasz `any` bez uzasadnienia

---

## Podsumowanie - Uniwersalne zasady

### Zasady ogólne

1. **Sprawdzaj typy przed commitem**
   - Nie polegaj tylko na dev mode
   - Uruchamiaj type-check przed commitem
   - Dodaj do CI/CD pipeline

2. **Obsługuj null/undefined**
   - Zawsze sprawdzaj wartości nullable
   - Używaj `??` i `?.`
   - Dodawaj walidację w serwisach

3. **Sprawdzaj dokumentację bibliotek**
   - API może się zmieniać między wersjami
   - Używaj najnowszej wersji API
   - Sprawdzaj przed użyciem

4. **Preferuj type narrowing nad assertions**
   - Używaj type guards
   - Type assertions tylko gdy jesteś pewien
   - Unikaj `as any`

5. **Sprawdzaj rezerwowane nazwy**
   - Frameworki mają specjalne konwencje
   - Niektóre nazwy są zarezerwowane
   - Sprawdzaj dokumentację

6. **Poprawne escapowanie regex**
   - Używaj podwójnego escapowania w stringach
   - Testuj regex przed użyciem
   - Rozważ RegExp constructor

7. **Type safety w warstwach danych**
   - Explicit type narrowing
   - Precyzyjne typy parametrów
   - Type aliases dla powtarzających się typów

8. **Spójność nazewnictwa**
   - Sprawdzaj nazwy między warstwami
   - Używaj find/replace dla globalnych zmian
   - Dokumentuj zmiany

9. **Usuwaj nieużywane wartości**
   - Tylko wartości istniejące w typie
   - Type-safe mapowania
   - Exhaustiveness checking

10. **Precyzyjne typy**
    - Zamiast ogólnych (`Record<string, string>`)
    - Definiuj explicite
    - Używaj type utilities

### Checklist przed commitem

- [ ] Type-check przechodzi bez błędów
- [ ] Lint przechodzi bez błędów
- [ ] Wszystkie wartości nullable są sprawdzane
- [ ] API bibliotek jest używane poprawnie
- [ ] Type assertions są używane tylko gdy jesteś pewien
- [ ] Nazwy nie są zarezerwowane przez framework
- [ ] Regex ma poprawne escapowanie
- [ ] Type safety w warstwach danych
- [ ] Spójność nazewnictwa między warstwami
- [ ] Nieużywane wartości są usunięte
- [ ] Typy są precyzyjne
- [ ] Build przechodzi

---

## Workflow developmentu

### Podczas developmentu

1. Uruchom watch mode dla typów
2. Uruchom dev server
3. Pisz kod, naprawiaj błędy typów na bieżąco

### Przed commitem

1. Sprawdź typy (`type-check`)
2. Sprawdź linting (`lint`)
3. Sprawdź build (`build`)
4. Commit

### W CI/CD

1. Install dependencies
2. Type check (najszybsze, blokuje dalsze kroki)
3. Linting
4. Build
5. Tests (jeśli są dostępne)

---

**Data ostatniej aktualizacji:** 2026-01-17  
**Status:** Aktywne  
**Zastosowanie:** Uniwersalne dla projektów TypeScript i Next.js
