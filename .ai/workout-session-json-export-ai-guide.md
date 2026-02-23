# Workout Session JSON Export - przewodnik dla AI

Ten dokument opisuje znaczenie pól w eksporcie JSON wykonanej sesji treningowej (eksport z widoku szczegółów sesji).

Cel: ułatwić analizę w czacie AI, zwłaszcza porównanie **planu treningowego** (`planned`) z **realnym wykonaniem** (`actual`, `sets`).

## 1. Co zawiera eksport

Plik JSON zawiera:
- `session` - metadane sesji (czas, status, plan)
- `exercises[]` - lista ćwiczeń z tej sesji
- dla każdego ćwiczenia:
  - `planned` - założenia planu na moment startu sesji
  - `actual` - agregaty wykonania
  - `sets[]` - szczegółowe logi serii

## 2. Główna struktura (top-level)

- `export_type`
  - Stała wartość: `workout_session`
  - Pozwala AI rozpoznać typ dokumentu.

- `export_version`
  - Wersja formatu eksportu (obecnie `1`).
  - Przy przyszłych zmianach format może się różnić.

- `exported_at`
  - Data/godzina wygenerowania pliku eksportu (ISO datetime).

- `session`
  - Metadane sesji treningowej.

- `exercises`
  - Ćwiczenia wykonane / zaplanowane w ramach sesji.

## 3. `session` - znaczenie pól

- `id`
  - ID sesji w aplikacji.

- `status`
  - Status sesji, np. `completed` albo `in_progress`.

- `workout_plan_id`
  - ID planu treningowego, z którego uruchomiono sesję (jeśli istnieje).

- `plan_name_at_time`
  - Nazwa planu zapisana w chwili rozpoczęcia sesji (snapshot nazwy).

- `started_at`
  - Czas rozpoczęcia sesji (ISO datetime).

- `completed_at`
  - Czas zakończenia sesji (ISO datetime) lub `null`, jeśli sesja trwa.

- `active_duration_seconds`
  - Czas aktywnego treningu mierzony timerem (sekundy), bez części przerw jeśli timer był pauzowany.

- `estimated_total_time_seconds`
  - Szacowany czas całego treningu z planu (sekundy), jeśli był dostępny.

- `exercise_count`
  - Liczba pozycji ćwiczeń w sesji.

- `current_position`
  - Aktualna pozycja kursora sesji (ważne głównie dla sesji w toku).

## 4. `exercises[]` - znaczenie pozycji planu treningowego i wykonania

Każdy element `exercises[]` to jedna pozycja ćwiczenia w sesji.

### 4.1 Pola identyfikacyjne i opisowe

- `id`
  - ID pozycji ćwiczenia w sesji (nie ID ćwiczenia z biblioteki).

- `order`
  - Kolejność ćwiczenia w sesji / planie (1, 2, 3...).

- `title`
  - Nazwa ćwiczenia zapisana w momencie startu sesji.

- `type`
  - Typ ćwiczenia (np. siłowe / cardio - zgodnie z enum aplikacji).

- `part`
  - Główna partia mięśniowa dla ćwiczenia (zgodnie z enum aplikacji).

- `exercise_id`
  - ID ćwiczenia z biblioteki (jeśli pozycja jest powiązana z biblioteką).

- `is_unilateral`
  - `true` jeśli ćwiczenie jest jednostronne (np. lewa/prawa strona).

- `is_skipped`
  - `true` jeśli ćwiczenie zostało pominięte.

### 4.2 `planned` - planowane parametry ćwiczenia (snapshot planu)

To są pola odpowiadające pozycji planu treningowego na moment uruchomienia sesji.

- `planned.sets`
  - Planowana liczba serii.

- `planned.reps`
  - Planowana liczba powtórzeń w serii.

- `planned.duration_seconds`
  - Planowany czas serii (sekundy), używane zamiast reps dla ćwiczeń czasowych.

- `planned.rest_between_sets_seconds`
  - Planowana przerwa między seriami (sekundy).

- `planned.rest_after_series_seconds`
  - Planowana przerwa po całym ćwiczeniu / po serii bloków (sekundy), jeśli dotyczy.

Uwaga interpretacyjna:
- Ćwiczenie zwykle ma sensowny plan jako:
  - `sets + reps` (np. siłowe), albo
  - `sets + duration_seconds` (np. plank / ćwiczenia czasowe)
- Część pól może być `null`.

### 4.3 `actual` - agregaty rzeczywistego wykonania

To są podsumowania wykonania policzone na poziomie ćwiczenia.

- `actual.count_sets`
  - Rzeczywiście wykonana liczba serii.

- `actual.sum_reps`
  - Suma wykonanych powtórzeń ze wszystkich serii.

- `actual.duration_seconds`
  - Rzeczywisty czas wykonania na poziomie ćwiczenia (agregat; zależnie od typu ćwiczenia/logowania).

- `actual.rest_seconds`
  - Rzeczywiste przerwy zapisane/agregowane dla ćwiczenia (jeśli dostępne).

Uwaga:
- `actual` to skrót/agregat.
- Najdokładniejszym źródłem danych do analizy trendów są `sets[]`.

### 4.4 `sets[]` - szczegółowe logi serii (najważniejsze do analizy AI)

Każdy element to jedna wykonana seria.

- `set_number`
  - Numer serii (1, 2, 3...).

- `side_number`
  - Numer strony dla ćwiczeń jednostronnych (np. 1/2), w przeciwnym razie `null`.

- `reps`
  - Liczba powtórzeń wykonanych w tej serii.

- `duration_seconds`
  - Czas trwania tej serii (sekundy), jeśli ćwiczenie jest czasowe.

- `weight_kg`
  - Ciężar użyty w tej serii (kg), jeśli logowany.

## 5. Jak AI powinno interpretować `planned` vs `actual`

Rekomendowana logika analizy:

1. Porównaj plan i wykonanie na poziomie ćwiczenia:
   - `planned.sets` vs `actual.count_sets`
   - `planned.reps * planned.sets` vs `actual.sum_reps` (gdy reps są dostępne)
   - `planned.duration_seconds` vs średni / łączny czas z `sets[]` (gdy ćwiczenie czasowe)

2. Następnie sprawdź jakość wykonania w `sets[]`:
   - spadek reps między seriami (zmęczenie)
   - wzrost/spadek ciężaru (`weight_kg`)
   - różnice między stronami (`side_number`) dla ćwiczeń unilateralnych

3. Uwzględnij `is_skipped`:
   - pominięte ćwiczenia nie powinny być traktowane jak "słabe wykonanie"
   - warto analizować je osobno (np. brak czasu, zmęczenie, ból)

4. Uwzględnij `status` sesji:
   - `in_progress` oznacza niepełne dane

## 6. Szybki prompt do analizy AI (przykład)

Możesz wkleić JSON i dodać prompt:

> Przeanalizuj tę sesję treningową. Porównaj `planned` vs `actual` dla każdego ćwiczenia, oceń gdzie miałam zapas siły (większy ciężar / więcej powtórzeń), gdzie było zmęczenie (spadki między seriami), oraz zaproponuj korekty planu na kolejny trening.

## 7. Ważne ograniczenia

- Dane są snapshotem sesji i planu z momentu treningu.
- Nie wszystkie pola muszą być uzupełnione (`null` jest normalne).
- Dla ćwiczeń czasowych ważniejsze są `duration_seconds` niż `reps`.
- Dla ćwiczeń siłowych najważniejsze są `reps` + `weight_kg`.
