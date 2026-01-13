# Lokalny vs Zdalny Supabase - Wyjaśnienie

## 🔍 Jak sprawdzić, którego używasz?

### Twój obecny setup:

**URL w `.env.local`:**
```
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
```

**Supabase Studio:**
```
http://127.0.0.1:54323
```

### ⚠️ To jest LOKALNY Supabase, NIE zdalny!

## 📊 Różnice

### 🖥️ Lokalny Supabase (to co masz teraz)

**Znaki rozpoznawcze:**
- ✅ URL zaczyna się od `http://127.0.0.1` lub `http://localhost`
- ✅ Porty: `54321` (API), `54322` (DB), `54323` (Studio)
- ✅ Uruchamiany przez `supabase start`
- ✅ Działa w Docker na Twoim komputerze
- ✅ Dane są w lokalnej bazie PostgreSQL (w kontenerze Docker)

**Zalety:**
- ✅ Darmowy
- ✅ Szybki (bez opóźnień sieciowych)
- ✅ Pełna kontrola
- ✅ Idealny do developmentu

**Wady:**
- ❌ Dane są efemeryczne (znikają po usunięciu kontenera)
- ❌ Tylko na Twoim komputerze
- ❌ Nie ma backupów automatycznych
- ❌ Nie dostępny z innych urządzeń

### ☁️ Zdalny Supabase (w chmurze)

**Znaki rozpoznawcze:**
- ✅ URL zaczyna się od `https://` i zawiera `.supabase.co`
- ✅ Przykład: `https://xxxxx.supabase.co`
- ✅ Dostępny przez przeglądarkę z dowolnego miejsca
- ✅ Dane są w chmurze Supabase

**Zalety:**
- ✅ Dane są trwałe (nie znikają)
- ✅ Automatyczne backupy
- ✅ Dostęp z dowolnego miejsca
- ✅ Współdzielony z zespołem
- ✅ Produkcyjny setup

**Wady:**
- ❌ Może kosztować (darmowy plan ma limity)
- ❌ Opóźnienia sieciowe
- ❌ Wymaga konta na supabase.com

## 🔄 Jak przełączyć się na zdalny Supabase?

### Krok 1: Utwórz projekt na supabase.com

1. Idź na https://supabase.com
2. Zaloguj się / Utwórz konto
3. Kliknij "New Project"
4. Wybierz organizację i nazwę projektu
5. Poczekaj na utworzenie (2-3 minuty)

### Krok 2: Połącz lokalny projekt ze zdalnym

```bash
# Zaloguj się do Supabase CLI
supabase login

# Połącz projekt z zdalnym projektem
supabase link --project-ref xxxxx
# (xxxxx to ID projektu z dashboardu)
```

### Krok 3: Zaktualizuj `.env.local`

```env
# Zamiast:
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321

# Użyj:
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=twoj-zdalny-klucz
```

Klucze znajdziesz w:
- Supabase Dashboard → Settings → API

### Krok 4: Zastosuj migracje na zdalnej bazie

```bash
# Push migracji do zdalnej bazy
supabase db push
```

## 🎯 Kiedy używać którego?

### Używaj lokalnego Supabase gdy:
- ✅ Rozwijasz nowe funkcje
- ✅ Testujesz zmiany
- ✅ Chcesz szybki feedback
- ✅ Nie potrzebujesz trwałych danych

### Używaj zdalnego Supabase gdy:
- ✅ Chcesz zachować dane na stałe
- ✅ Współpracujesz z zespołem
- ✅ Testujesz z prawdziwymi danymi
- ✅ Przygotowujesz do produkcji

## 💡 Zalecany workflow

### Opcja 1: Tylko lokalny (dla solo developmentu)
```
Lokalny Supabase → Development → Testy → Gotowe
```

### Opcja 2: Lokalny + Zdalny (zalecane)
```
Lokalny Supabase → Development → Testy
         ↓
Zdalny Supabase → Staging/Test → Produkcja
```

### Opcja 3: Tylko zdalny (dla małych projektów)
```
Zdalny Supabase → Development → Produkcja
```

## 🔍 Jak sprawdzić, z którym się łączysz?

### Sprawdź `.env.local`:
```bash
cat .env.local | grep SUPABASE_URL
```

- `http://127.0.0.1` = lokalny
- `https://xxxxx.supabase.co` = zdalny

### Sprawdź w kodzie:
```typescript
// W przeglądarce (DevTools → Console)
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
```

### Sprawdź status Supabase:
```bash
supabase status
```

Jeśli widzisz:
- `http://127.0.0.1:54321` = lokalny
- Brak outputu lub błąd = możliwe, że używasz zdalnego

## 🚨 Dlaczego Twoje dane zniknęły?

**Używasz lokalnego Supabase**, więc:
- Dane są w kontenerze Docker
- Po restarcie/usunięciu kontenera → dane znikają
- To normalne zachowanie dla lokalnego setupu

**Rozwiązanie:**
1. Użyj zdalnego Supabase dla danych, które chcesz zachować
2. LUB rób regularne backupy lokalnej bazy (`pnpm backup:db`)

## 📝 Podsumowanie

**Twój obecny setup:**
- ❌ **Lokalny** Supabase (`127.0.0.1`)
- ❌ Dane mogą zniknąć po restarcie kontenera
- ✅ Dobry do developmentu
- ❌ Nie dobry do trwałych danych

**Aby zachować dane:**
- ✅ Przełącz się na zdalny Supabase
- ✅ LUB rób regularne backupy lokalnej bazy
