# Przewodnik CI/CD i Best Practices

## Data utworzenia: 2025-01-16

## Przegląd

Niniejszy dokument zawiera rekomendacje dotyczące konfiguracji CI/CD, sprawdzania typów TypeScript oraz best practices dla projektu Go Girl Workout App.

---

## Sprawdzanie typów TypeScript

### Problem: Błędy typów wykrywane dopiero podczas builda produkcyjnego

**Dlaczego błędy nie były wykrywane wcześniej:**

1. **ESLint nie sprawdza typów TypeScript**
   - ESLint sprawdza tylko składnię i style kodu
   - Nie weryfikuje poprawności typów TypeScript
   - `lint-staged` uruchamiał tylko ESLint

2. **Next.js dev mode jest bardziej tolerancyjny**
   - `next dev` może ignorować niektóre błędy typów dla szybszego developmentu
   - `next build` sprawdza typy rygorystycznie i blokuje build przy błędach

3. **Brak sprawdzania typów w pre-commit**
   - Husky uruchamiał tylko `lint-staged` (ESLint)
   - Brak skryptu `type-check` w `package.json`

4. **Next.js 16 może mieć bardziej restrykcyjne sprawdzanie**
   - Nowa wersja może mieć inne ustawienia TypeScript podczas builda

### Rozwiązanie: Dodano sprawdzanie typów do workflow

#### 1. Skrypt type-check w package.json

```json
{
  "scripts": {
    "type-check": "tsc --noEmit",
    "type-check:watch": "tsc --noEmit --watch"
  }
}
```

**Użycie:**
```bash
# Sprawdź typy ręcznie
pnpm type-check

# Sprawdź typy w trybie watch (podczas developmentu)
pnpm type-check:watch
```

#### 2. Pre-commit hook (.husky/pre-commit)

Hook automatycznie sprawdza typy przed każdym commitem:

```bash
echo "HUSKY PRE-COMMIT RUNNING"

# Sprawdź typy TypeScript przed commitem
echo "🔍 Sprawdzanie typów TypeScript..."
pnpm type-check || {
  echo "❌ Błędy typów TypeScript wykryte! Napraw błędy przed commitem."
  exit 1
}

# Uruchom lint-staged (ESLint)
echo "🔍 Sprawdzanie składni i stylu kodu..."
pnpm lint-staged
```

**Efekt:**
- Błędy typów są wykrywane przed commitem
- Commit jest blokowany, jeśli są błędy typów
- Zapewnia, że tylko poprawny kod trafia do repozytorium

---

## Rekomendacje dla CI/CD

### 1. GitHub Actions

Dodaj sprawdzanie typów do workflow GitHub Actions:

```yaml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  type-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm type-check
      - run: pnpm lint
      - run: pnpm build
```

### 2. Vercel

Vercel automatycznie uruchamia `next build`, który sprawdza typy. Upewnij się, że:

- ✅ Build command: `pnpm build` (domyślne)
- ✅ Installed command: `pnpm install` (domyślne)
- ✅ Node.js version: 22.x (sprawdź w Settings → General)

**Rekomendacja:** Dodaj preview deployment checks:

1. Przejdź do Vercel Dashboard → Settings → Git
2. Włącz "Deploy Previews" dla pull requests
3. Sprawdź, czy build przechodzi przed mergem

### 3. Pre-commit workflow

**Zalecany workflow przed commitem:**

```bash
# 1. Sprawdź typy (szybkie sprawdzenie)
pnpm type-check

# 2. Sprawdź linting
pnpm lint

# 3. Jeśli wszystko OK, commit
git commit -m "feat: dodaj funkcjonalność"
```

**Lub użyj watch mode podczas developmentu:**

```bash
# W jednym terminalu
pnpm type-check:watch

# W drugim terminalu
pnpm dev
```

### 4. CI Pipeline - Zalecana kolejność

1. **Install dependencies**
   ```bash
   pnpm install --frozen-lockfile
   ```

2. **Type check** (najszybsze, blokuje dalsze kroki)
   ```bash
   pnpm type-check
   ```

3. **Linting** (sprawdza style i składnię)
   ```bash
   pnpm lint
   ```

4. **Build** (pełna kompilacja)
   ```bash
   pnpm build
   ```

5. **Tests** (jeśli są dostępne)
   ```bash
   pnpm test
   ```

---

## Best Practices

### Development

1. **Używaj watch mode podczas developmentu**
   ```bash
   pnpm type-check:watch
   ```
   - Automatycznie wykrywa błędy typów podczas pisania kodu
   - Szybsze niż uruchamianie `type-check` ręcznie

2. **Sprawdzaj typy przed commitem**
   - Pre-commit hook zrobi to automatycznie
   - Możesz też uruchomić ręcznie: `pnpm type-check`

3. **Nie ignoruj błędów typów w dev mode**
   - Nawet jeśli `next dev` działa, błędy typów mogą powodować problemy w produkcji
   - Naprawiaj błędy od razu

### CI/CD

1. **Zawsze sprawdzaj typy przed buildem**
   - Dodaj `pnpm type-check` do CI pipeline
   - Blokuj deployment, jeśli są błędy typów

2. **Używaj frozen-lockfile w CI**
   ```bash
   pnpm install --frozen-lockfile
   ```
   - Zapewnia, że CI używa dokładnie tych samych wersji co lokalnie

3. **Cache dependencies w CI**
   - Przyspiesza buildy
   - GitHub Actions: użyj `actions/setup-node@v4` z `cache: 'pnpm'`
   - Vercel: automatycznie cache'uje node_modules

4. **Fail fast principle**
   - Sprawdzaj typy jako pierwszy krok w CI
   - Jeśli typy są błędne, nie ma sensu uruchamiać reszty pipeline

### Code Review

1. **Sprawdź, czy build przechodzi**
   - W GitHub: sprawdź status checków przed mergem
   - W Vercel: sprawdź preview deployment

2. **Nie merguj, jeśli są błędy typów**
   - Nawet jeśli kod "działa", błędy typów mogą powodować problemy w produkcji

---

## Troubleshooting

### Problem: type-check jest wolny

**Rozwiązanie:**
- Używaj `type-check:watch` podczas developmentu (sprawdza tylko zmienione pliki)
- W CI uruchamiaj `type-check` równolegle z innymi checkami

### Problem: Błędy typów w node_modules

**Rozwiązanie:**
- Sprawdź `tsconfig.json` - powinno mieć `"skipLibCheck": true`
- Jeśli problemy z typami zewnętrznych bibliotek, zignoruj je lub zaktualizuj bibliotekę

### Problem: Pre-commit hook jest zbyt wolny

**Rozwiązanie:**
- Używaj `type-check:watch` podczas developmentu
- W pre-commit uruchamiaj tylko `type-check` (bez watch)
- Rozważ użycie `tsc-files` do sprawdzania tylko zmienionych plików

---

## Podsumowanie

### ✅ Co zostało zaimplementowane

1. ✅ Skrypt `type-check` w `package.json`
2. ✅ Pre-commit hook sprawdzający typy
3. ✅ Wszystkie błędy typów naprawione
4. ✅ Build kompiluje się poprawnie

### 📋 Checklist przed commitem

- [ ] `pnpm type-check` przechodzi bez błędów
- [ ] `pnpm lint` przechodzi bez błędów
- [ ] Kod działa lokalnie (`pnpm dev`)
- [ ] Build przechodzi (`pnpm build`)

### 🚀 Checklist przed deploymentem

- [ ] Wszystkie checki CI przechodzą
- [ ] Preview deployment działa poprawnie
- [ ] Testy (jeśli są) przechodzą
- [ ] Code review zatwierdzony

---

**Data ostatniej aktualizacji:** 2025-01-16  
**Status:** Aktywne
