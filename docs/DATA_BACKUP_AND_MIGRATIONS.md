# Backup danych i bezpieczne migracje

## ⚠️ Dlaczego dane zniknęły?

Najprawdopodobniej uruchomiłaś jedną z tych komend, które **USUWAJĄ WSZYSTKIE DANE**:

### 1. `supabase db reset` (NAJGROŹNIEJSZA)
```bash
supabase db reset  # ❌ USUWA WSZYSTKIE DANE!
```
Ta komenda:
- Usuwa całą bazę danych
- Tworzy ją od nowa
- Uruchamia wszystkie migracje od początku
- **USUWA WSZYSTKIE DANE, WŁĄCZNIE Z UŻYTKOWNIKAMI**

### 2. `supabase db push` na pustej bazie
Jeśli baza była pusta, `db push` tylko tworzy schemat bez danych.

### 3. Połączenie z innym projektem
Jeśli zmieniłaś URL w `.env.local`, możesz łączyć się z innym (pustym) projektem.

## 🔒 Jak zapobiec utracie danych w przyszłości?

### 1. Zawsze rób backup przed migracjami

#### Backup lokalnej bazy Supabase:
```bash
# Eksportuj dane do pliku SQL
supabase db dump -f backup_$(date +%Y%m%d_%H%M%S).sql

# Lub eksportuj tylko dane (bez schematu)
supabase db dump --data-only -f data_backup_$(date +%Y%m%d_%H%M%S).sql
```

#### Backup zdalnej bazy Supabase:
```bash
# Połącz się z zdalną bazą i zrób dump
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" > backup_remote.sql
```

### 2. Używaj bezpiecznych komend do migracji

#### ✅ BEZPIECZNE - Tylko nowe migracje:
```bash
# Zastosuj tylko nowe migracje (nie usuwa danych)
supabase migration up

# Lub użyj Supabase CLI do push tylko nowych migracji
supabase db push
```

#### ❌ NIEBEZPIECZNE - Usuwa dane:
```bash
# NIGDY nie używaj tej komendy jeśli masz dane!
supabase db reset  # ❌ USUWA WSZYSTKO!
```

### 3. Sprawdź, czy masz dane przed resetem

```bash
# Sprawdź liczbę użytkowników
supabase db execute "SELECT COUNT(*) FROM auth.users;"

# Sprawdź liczbę ćwiczeń
supabase db execute "SELECT COUNT(*) FROM exercises;"

# Sprawdź liczbę treningów
supabase db execute "SELECT COUNT(*) FROM workout_sessions;"
```

### 4. Używaj seed files dla danych testowych

Zamiast ręcznie dodawać dane przez Postmana, użyj seed files:

**Plik:** `supabase/seed.sql`
```sql
-- Przykładowy seed file
INSERT INTO auth.users (id, email) VALUES 
  ('6f6b1fa9-d016-46c7-af12-5b4f03b0308c', 'test@example.com')
ON CONFLICT DO NOTHING;

INSERT INTO exercises (user_id, title, type, part, series, reps, rest_in_between_seconds)
VALUES 
  ('6f6b1fa9-d016-46c7-af12-5b4f03b0308c', 'Przysiady', 'Main Workout', 'Legs', 3, 10, 60)
ON CONFLICT DO NOTHING;
```

Seed files są automatycznie uruchamiane po `supabase db reset`, więc możesz bezpiecznie resetować bazę z danymi testowymi.

## 🔄 Różnica między lokalnym a zdalnym Supabase

### Lokalny Supabase (Development)
- Uruchamiany przez `supabase start`
- Dane są w lokalnej bazie PostgreSQL
- **`supabase db reset` usuwa WSZYSTKIE lokalne dane**
- Używany do developmentu

### Zdalny Supabase (Production/Staging)
- Hostowany na supabase.com
- Dane są w chmurze
- **NIGDY nie używaj `db reset` na zdalnej bazie!**
- Używany do produkcji/stagingu

## 📋 Checklist przed migracjami

- [ ] Sprawdź, czy masz dane w bazie
- [ ] Zrób backup (`supabase db dump`)
- [ ] Sprawdź, czy używasz właściwego projektu (lokalny vs zdalny)
- [ ] Użyj `supabase migration up` zamiast `db reset`
- [ ] Przetestuj migracje na kopii bazy

## 🛠️ Przydatne komendy

```bash
# Sprawdź status migracji
supabase migration list

# Zastosuj tylko nowe migracje (bezpieczne)
supabase migration up

# Zobacz historię migracji
supabase db diff

# Backup przed zmianami
supabase db dump -f backup.sql

# Przywróć z backupu
psql -h localhost -p 54322 -U postgres -d postgres < backup.sql
```

## 💡 Najlepsze praktyki

1. **Zawsze rób backup przed `db reset`**
2. **Używaj seed files dla danych testowych**
3. **Używaj `migration up` zamiast `db reset`**
4. **Sprawdzaj, czy masz dane przed resetem**
5. **Używaj osobnych projektów dla dev/staging/prod**
6. **Dokumentuj zmiany w migracjach**

## 🚨 Co zrobić, jeśli dane już zniknęły?

Niestety, jeśli uruchomiłaś `supabase db reset` bez backupu, dane są utracone. W przyszłości:

1. Zawsze rób backup przed resetem
2. Używaj seed files dla danych testowych
3. Rozważ użycie zdalnego Supabase dla danych, które chcesz zachować
