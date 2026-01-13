# Analiza utraty danych - Raport

## 📊 Stan obecny bazy danych

**Data analizy:** 2026-01-13 12:22 UTC

### Dane w bazie:
- ✅ **Użytkownicy:** 1 (anitka.ba@gmail.com, utworzony: 2026-01-13 12:10:31)
- ✅ **Ćwiczenia:** 1 ("Rozciąganie nóg - skłon do przodu", utworzone: 2026-01-13 12:13:46)
- ❌ **Workout Sessions:** 0
- ❌ **Workout Plans:** 0

### Migracje:
- ✅ Wszystkie 10 migracji są zastosowane
- ✅ Ostatnia migracja: `20260108120009_rename_position_to_order`

## 🔍 Analiza logów i historii

### Historia komend z zsh:

Z historii komend widzę następujące operacje na bazie:
```bash
supabase stop
supabase start
supabase migration up
supabase db push
supabase start
```

**Nie widzę `supabase db reset` w historii**, ale widzę:
- `supabase stop` - zatrzymanie lokalnego Supabase
- `supabase start` - uruchomienie lokalnego Supabase
- `supabase db push` - push migracji (może być problematyczne)
- `supabase migration up` - bezpieczne zastosowanie migracji

### Analiza kontenera Docker:

**Kontener został utworzony:** 2026-01-13 12:11:48 UTC

**Logi bazy danych pokazują:**
```
database system was interrupted; last known up at 2026-01-13 12:11:10 UTC
database system was not properly shut down; automatic recovery in progress
```

To sugeruje, że:
1. Baza została nieprawidłowo zamknięta (prawdopodobnie `supabase stop` lub restart)
2. Kontener został utworzony/restartowany dzisiaj o 12:11:48
3. Baza przeszła automatyczną recovery

### Konfiguracja:

- **Typ Supabase:** Lokalny (http://127.0.0.1:54321)
- **Kontener:** `supabase_db_go-girl-workout-app`
- **Status:** Działa poprawnie

## 💡 Prawdopodobne przyczyny utraty danych

### Scenariusz 1: Restart kontenera Docker (NAJPRAWDOPODOBNIEJSZY)

1. **Wczoraj:** Dodawałaś ćwiczenia i treningi przez Postmana do lokalnej bazy
2. **Dzisiaj rano (przed 12:10):** 
   - Uruchomiono `supabase stop` lub restart systemu
   - Kontener Docker został usunięty/restartowany
   - **Lokalne dane Docker są efemeryczne** - po usunięciu kontenera dane znikają
3. **12:11:48:** Kontener został utworzony od nowa
4. **12:10-12:13:** Utworzono nowego użytkownika i ćwiczenie

### Scenariusz 2: `supabase db push` na pustej bazie

Komenda `supabase db push` widoczna w historii mogła:
- Zastosować migracje na pustej bazie
- Nadpisać istniejące dane (jeśli były konflikty)

### Scenariusz 3: Restart systemu / Docker Desktop

Jeśli:
- Zrestartowałaś komputer
- Zrestartowałaś Docker Desktop
- Kontener został usunięty

**Lokalne dane Docker są przechowywane w volume, ale jeśli volume został usunięty, dane znikają.**

## ⚠️ Dlaczego lokalne dane zniknęły?

**Lokalny Supabase używa Docker volumes do przechowywania danych.**

Dane mogą zniknąć jeśli:
1. ✅ Volume został usunięty (`docker volume rm`)
2. ✅ Kontener został usunięty z flagą `-v` (`docker rm -v`)
3. ✅ `supabase stop` + usunięcie volume
4. ✅ Restart Docker Desktop z resetem danych
5. ✅ `supabase db reset` (nie widzę w historii, ale możliwe)

## 🔒 Jak zapobiec w przyszłości?

### 1. Używaj zdalnego Supabase dla danych produkcyjnych

Lokalny Supabase jest do developmentu. Dla danych, które chcesz zachować:
- Użyj zdalnego Supabase (supabase.com)
- Lub rób regularne backupy lokalnej bazy

### 2. Regularne backupy

```bash
# Przed każdą zmianą
pnpm backup:db

# Backup tylko danych
pnpm backup:db:data
```

### 3. Sprawdzaj volume Docker

```bash
# Sprawdź, czy volume istnieje
docker volume ls | grep supabase

# Sprawdź szczegóły volume
docker volume inspect supabase_db_go-girl-workout-app
```

### 4. Używaj seed files

Zamiast ręcznie dodawać dane przez Postmana, użyj `supabase/seed.sql`:
- Dane są w repozytorium
- Automatycznie ładowane po `supabase db reset`
- Łatwe do przywrócenia

## 📋 Rekomendacje

1. **Natychmiast:**
   - Sprawdź, czy masz backup z wczoraj
   - Jeśli nie, niestety dane są utracone

2. **Na przyszłość:**
   - Używaj `pnpm backup:db` przed każdą zmianą
   - Rozważ użycie zdalnego Supabase dla danych testowych
   - Używaj seed files zamiast ręcznego dodawania przez Postmana
   - Dokumentuj, kiedy robisz zmiany w bazie

3. **Dla developmentu:**
   - Lokalny Supabase jest OK dla testów
   - Ale pamiętaj, że dane są efemeryczne
   - Rób backupy przed ważnymi zmianami

## 🛠️ Przydatne komendy do diagnostyki

```bash
# Sprawdź status Supabase
supabase status

# Sprawdź volume Docker
docker volume ls | grep supabase
docker volume inspect supabase_db_go-girl-workout-app

# Sprawdź logi bazy
docker logs supabase_db_go-girl-workout-app

# Sprawdź dane w bazie
docker exec supabase_db_go-girl-workout-app psql -U postgres -d postgres -c "SELECT COUNT(*) FROM exercises;"
```

## 📝 Wnioski

**Najprawdopodobniejsza przyczyna:** Restart/usunięcie kontenera Docker, co spowodowało utratę lokalnych danych.

**Dlaczego użytkownik i ćwiczenie przetrwały?** Zostały utworzone dzisiaj (po restarcie) o 12:10-12:13.

**Dlaczego wczorajsze dane zniknęły?** Kontener został zrestartowany/utworzony od nowa, a lokalne volume Docker zostało zresetowane lub usunięte.
