# Instrukcja: Uruchomienie migracji na zdalnej bazie Supabase

## ⚠️ WAŻNE: Backup przed migracjami!

**Zawsze rób backup przed uruchomieniem migracji na zdalnej bazie!**

## Krok 1: Sprawdź połączenie z zdalną bazą

```bash
# Sprawdź czy jesteś zalogowany do Supabase CLI
supabase login

# Sprawdź listę projektów
supabase projects list

# Sprawdź czy projekt jest połączony
supabase link --project-ref YOUR_PROJECT_REF
```

## Krok 2: Backup zdalnej bazy (OPCJONALNE, ale zalecane)

```bash
# Backup przez Supabase CLI (jeśli masz dostęp)
supabase db dump --linked -f backup_$(date +%Y%m%d_%H%M%S).sql

# Lub przez pg_dump (jeśli masz hasło)
pg_dump "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" > backup_remote_$(date +%Y%m%d_%H%M%S).sql
```

## Krok 3: Uruchom migracje na zdalnej bazie

### Opcja A: Przez Supabase CLI (zalecane)

```bash
# Push wszystkich nowych migracji do zdalnej bazy
supabase db push --linked
```

### Opcja B: Przez Supabase Dashboard (SQL Editor)

1. Otwórz Supabase Dashboard → SQL Editor
2. Skopiuj zawartość pliku: `supabase/migrations/20260126154730_add_snapshot_to_workout_plan_exercises.sql`
3. Wykonaj migrację w SQL Editor
4. Powtórz dla: `supabase/migrations/20260126154731_allow_null_exercise_id_in_workout_session_exercises.sql`

## Krok 4: Zregeneruj typy TypeScript z zdalnej bazy

```bash
# Generuj typy z zdalnej bazy (połączonej)
supabase gen types typescript --linked > src/db/database.types.ts

# Lub jeśli nie masz połączenia, użyj URL i klucza
supabase gen types typescript --project-id YOUR_PROJECT_REF > src/db/database.types.ts
```

## Krok 5: Weryfikacja migracji

```bash
# Sprawdź czy kolumny zostały dodane
supabase db remote exec "SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'workout_plan_exercises' 
AND column_name IN ('exercise_id', 'exercise_title', 'exercise_type', 'exercise_part');"

# Sprawdź constraint
supabase db remote exec "SELECT conname, contype 
FROM pg_constraint 
WHERE conrelid = 'workout_plan_exercises'::regclass 
AND conname LIKE '%snapshot%';"
```

## Rozwiązywanie problemów

### Błąd: "Project not linked"
```bash
# Połącz projekt
supabase link --project-ref YOUR_PROJECT_REF
```

### Błąd: "Not logged in"
```bash
# Zaloguj się
supabase login
```

### Błąd: "Migration already applied"
- To normalne - migracja została już zastosowana
- Sprawdź status: `supabase migration list --linked`

## Checklist

- [ ] Backup zdalnej bazy (opcjonalne, ale zalecane)
- [ ] Połączony z zdalnym projektem (`supabase link`)
- [ ] Uruchomione migracje (`supabase db push --linked`)
- [ ] Zregenerowane typy TypeScript (`supabase gen types typescript --linked`)
- [ ] Weryfikacja migracji (sprawdzenie kolumn i constraintów)
- [ ] Test kompilacji TypeScript (`pnpm type-check`)
- [ ] Test build (`pnpm build`)
