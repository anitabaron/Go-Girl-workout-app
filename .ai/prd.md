# Dokument wymagań produktu (PRD) - Go Girl

## 1. Przegląd produktu

### 1.1 Cel produktu

Go Girl to prywatna aplikacja webowa dla kobiet w wieku 30–45 lat, które regularnie trenują (szczególnie kalistenika i trening siłowy) i chcą:

- budować siłę,
- kształtować sylwetkę oraz konkretne grupy mięśni,
- planować treningi z pojedynczych ćwiczeń,
- logować realne wykonanie treningu,
- śledzić rekordy (PR) w ćwiczeniach,
- opcjonalnie generować/optmalizować plany treningowe przez AI, zgodnie z preferencjami.

### 1.2 Zakres MVP

W MVP produkt dostarcza:

- konta użytkowników (Supabase Auth),
- prywatną bibliotekę ćwiczeń (CRUD),
- plany treningowe jako szablony wielokrotnego użytku (CRUD),
- asystenta treningu do wykonywania sesji (start/pause/next/back/skip) z autozapisem i możliwością wznowienia,
- historię sesji i PR per ćwiczenie, wyliczane z zapisanych serii,
- integrację AI przez jeden endpoint (OpenRouter), ograniczoną do ćwiczeń użytkownika, z limitem 5/miesiąc per użytkownik.

### 1.3 Użytkownicy i kontekst użycia

- Użytkowniczka planuje trening na podstawie własnej bazy ćwiczeń.
- Użytkowniczka wykonuje trening “krok po kroku” z telefonem obok.
- Po treningu chce szybko zobaczyć historię i PR bez dodatkowej konfiguracji.

### 1.4 Założenia

- Projekt prywatny, maksymalnie około 5 użytkowników.
- Priorytetem jest funkcjonalność i prostota, a nie rozbudowana analityka.
- Brak funkcji społecznościowych, brak udostępniania treningów.
- Integracja AI jest etapem po wdrożeniu podstawowych CRUD oraz asystenta sesji.
- Aplikacja (Next.js) jest hostowana na Vercel, aby uprościć wdrożenia i zminimalizować ryzyko związane z SSR/route handlers.

## 2. Problem użytkownika

### 2.1 Główny problem

Osoby trenujące regularnie potrzebują narzędzia, które pozwala:

- budować kompletne plany treningowe z pojedynczych ćwiczeń,
- wykonywać trening “prowadzone” (asystent krokowy) bez chaosu w notatkach,
- zapisywać realne wykonanie (różnice plan vs wykonanie),
- automatycznie wykrywać i oznaczać rekordy w ćwiczeniach (PR),
- w razie potrzeby uzyskać propozycję/optmalizację treningu przez AI przy minimalnym wysiłku.

### 2.2 Co dziś nie działa (typowe “pain points”)

- Planowanie w notatkach/arkuszach: brak spójnego modelu danych i brak historii “wykonania”.
- Trudne porównanie planu do wykonania i ręczne liczenie rekordów.
- Powtarzalne układanie treningów bez wsparcia preferencji.

### 2.3 Jak MVP rozwiązuje problem

- Uporządkowane obiekty: Exercise, WorkoutPlan, WorkoutSession, Set Logs.
- Asystent prowadzi przez ćwiczenia, zapisuje faktyczne wykonanie i pozwala wznawiać przerwane sesje.
- PR wyliczane deterministycznie na podstawie zapisanych serii.
- AI ograniczone do biblioteki użytkowniczki (brak “halucynowanych” ćwiczeń) i kontrolowane limitem.

## 3. Wymagania funkcjonalne

### 3.1 Konta i bezpieczeństwo dostępu

3.1.1 Aplikacja musi obsługiwać logowanie użytkowników przez Supabase Auth z użyciem tradycyjnego formularza email/password. Aplikacja powinna również obsługiwać rejestrację nowych użytkowników oraz reset hasła.
3.1.2 Wszystkie dane domenowe (ćwiczenia, plany, sesje, PR, logi AI) muszą być prywatne per użytkownik i zabezpieczone na poziomie bazy przez RLS z filtrem user_id.
3.1.3 Frontend nie może zakładać zaufania do danych po stronie klienta; egzekwowanie dostępu musi działać niezależnie od UI.

### 3.2 Biblioteka ćwiczeń (Exercise) - CRUD

3.2.1 Użytkowniczka może tworzyć, przeglądać, edytować i usuwać ćwiczenia.
3.2.2 Ćwiczenie ma co najmniej pola:

- title (string),
- type (enum: Warm-up | Main Workout | Cool-down),
- part (enum: Legs | Core | Back | Arms | Chest),
- wymagane: co najmniej jedno z pól opisujących pracę: time lub reps,
- wymagane: co najmniej jedno z pól opisujących serie : series
- wymagane: co najmniej jedno z pól opisujących odpoczynek: estInBetween lub restAfterSeries
- opcjonalnie: level, details.
  3.2.3 Unikalność ćwiczeń:
- ćwiczenia są prywatne per użytkownik,
- nie dopuszcza się duplikatów wg title (case-insensitive),
- normalizacja title: trim + lowercase + redukcja wielokrotnych spacji,
- aplikacja powinna wykrywać konflikt i blokować zapis duplikatu.
  3.2.4 Usuwanie ćwiczeń:
- usunięcie ćwiczenia musi być blokowane, jeśli ćwiczenie jest powiązane z jakąkolwiek WorkoutSession lub PR,
- produkt powinien wyświetlić czytelny komunikat, dlaczego usunięcie jest niemożliwe.

### 3.3 Plany treningowe (WorkoutPlan) - CRUD

3.3.1 Użytkowniczka może tworzyć, przeglądać, edytować i usuwać plany treningowe (szablony).
3.3.2 Plan treningu zawiera:

- name, opcjonalnie description,
- docelową partię (part) jako metadane planu (do filtrowania/organizacji),
- listę ćwiczeń w stałej kolejności.
  3.3.3 Każde ćwiczenie w planie ma domyślne parametry planu (planned\_\*), np. planned_sets, planned_reps, planned_duration, planned_rest.
  3.3.4 W ramach MVP kolejność ćwiczeń w sesji jest stała; plan determinuje kolejność.

### 3.4 Sesje treningowe (WorkoutSession) - wykonywanie i logowanie

3.4.1 Użytkowniczka może rozpocząć sesję z wybranego planu (WorkoutPlan).
3.4.2 WorkoutSession jest jednorazowym wykonaniem z datą (timestamp rozpoczęcia) i statusem:

- in_progress, gdy przerwana przed końcem listy ćwiczeń,
- completed, gdy użytkowniczka dotrze do końca listy (nawet jeśli część ćwiczeń była pominięta przez skip).
  3.4.3 WorkoutSession przechowuje pełną kopię danych wykonywania:
- planned*\* oraz actual*\* dla każdego ćwiczenia,
- set logs jako tablicę serii (dla każdego ćwiczenia).
  3.4.4 Użytkowniczka ma asystenta treningu:
- widok bieżącego ćwiczenia oraz jego planowanych parametrów,
- możliwość wpisania/edycji actual\_\* (różnice plan vs wykonanie),
- kontrolki: start, pause, next, previous, skip.
  3.4.5 Zasady nawigacji w asystencie:
- next przechodzi do następnego ćwiczenia i zapisuje stan aktualnego ćwiczenia,
- previous przechodzi do poprzedniego ćwiczenia,
- skip oznacza pominięcie ćwiczenia i przechodzi dalej,
- brak undo,
- brak early finish.
  3.4.6 Autosave i wznowienie:
- system zapisuje sesję przy każdym next i przy każdej pauzie,
- jeśli istnieje in_progress, użytkowniczka może ją wznowić.
  3.4.7 Edycja wcześniejszych ćwiczeń w sesji:
- użytkowniczka może wejść previous do wcześniej odwiedzonego ćwiczenia,
- zmiany nadpisują wcześniejszy zapis logów,
- PR muszą zostać przeliczone zgodnie z aktualnym stanem danych.
  3.4.8 Ograniczenie równoległych sesji:
- w MVP użytkowniczka może mieć maksymalnie jedną sesję in_progress,
- próba rozpoczęcia nowej sesji przy istniejącej in_progress prowadzi do wznowienia istniejącej sesji (lub blokady startu z komunikatem).

### 3.5 Rekordy (PR) i historia

3.5.1 PR liczone są deterministycznie wyłącznie na podstawie zapisanych set logs (zatwierdzonych przez next).
3.5.2 PR powstają także z sesji częściowo wykonanych, jeśli set logs zostały zapisane (np. po next).
3.5.3 PR są liczone per ćwiczenie i per typ metryki (jeśli dana metryka występuje w set logs):

- max_reps: maksymalna liczba powtórzeń w pojedynczej serii,
- max_duration: maksymalny czas (duration) w pojedynczej serii,
- max_weight: największe obciążenie (weight) w pojedynczej serii.
  3.5.4 Jeśli ćwiczenie ma więcej niż jedną metrykę w logach, aplikacja może prowadzić równolegle kilka rekordów dla tego samego ćwiczenia (po typie metryki).
  3.5.5 Ćwiczenia unilateralne:
- są traktowane jako jedno ćwiczenie,
- PR nie rozróżniają stron (brak left/right).
  3.5.6 Historia treningów:
- użytkowniczka widzi listę WorkoutSession (co najmniej data, plan, status),
- może wejść w szczegóły sesji i zobaczyć planned*\* oraz actual*\* dla ćwiczeń i serii.

### 3.6 AI: generowanie i optymalizacja treningów (po CRUD)

3.6.1 Integracja AI działa wyłącznie przez endpoint serwerowy (nie z klienta) z użyciem OpenRouter.
3.6.2 AI może:

- wygenerować nowy plan treningowy na podstawie parametrów z formularza “na żądanie”,
- zoptymalizować istniejący plan treningowy.
  3.6.3 Ograniczenia MVP dla AI:
- AI może używać tylko ćwiczeń użytkowniczki (exercise_id z jej biblioteki),
- AI nie tworzy nowych ćwiczeń w MVP,
- AI może parametryzować plan (planned\_\*: sets/reps/duration/rest).
  3.6.4 Kontrakt odpowiedzi AI:
- AI zwraca ustrukturyzowany JSON zawierający listę elementów planu: exercise*id oraz parametry planned*\*,
- produkt waliduje JSON i odrzuca plan, jeśli zawiera exercise_id nie należące do użytkowniczki lub brakujące wymagane pola.
  3.6.5 Limity AI:
- limit 5 akcji AI na użytkownika na miesiąc (reset 1. dnia miesiąca),
- generuj i optymalizuj liczą się identycznie,
- retry nie jest liczone tylko, jeśli poprzednie wywołanie zakończyło się błędem systemowym (np. błąd sieci/5xx).
  3.6.6 Polityka danych dla AI:
- do AI wysyłane są tylko niezbędne dane (parametry formularza + plan, bez danych identyfikujących),
- system loguje parametry wejściowe (bez PII), wyjściowy JSON oraz error codes,
- klucz OpenRouter przechowywany tylko po stronie serwera.
  3.6.7 Model domyślny i fallback:
- do ustalenia na późniejszym etapie (w PRD pozostaje jako decyzja otwarta).

### 3.7 Wymagania niefunkcjonalne (MVP)

3.7.1 Bezpieczeństwo:

- RLS musi być włączone i przetestowane dla wszystkich tabel domenowych,
- brak operacji, które pozwalają odczytać cudze dane przez manipulację ID.
  3.7.2 Niezawodność asystenta:
- autosave ma minimalizować utratę danych przy odświeżeniu lub przerwaniu,
- sesję in_progress musi dać się wznowić.
  3.7.3 Wydajność:
- listy ćwiczeń i sesji powinny ładować się szybko dla małej skali (5 użytkowników); paginacja może być uproszczona, ale architektura nie może uniemożliwiać jej dodania.
  3.7.4 UI:
- UI oparte o shadcn/ui.

## 4. Granice produktu

### 4.1 W zakresie MVP

- Konta użytkowników i prywatność danych per user_id (Supabase RLS).
- CRUD ćwiczeń.
- CRUD planów treningowych.
- Asystent treningu (wykonywanie sesji) z autosave: start, skip, next, previous, pause.
- Historia sesji treningowych.
- PR per ćwiczenie liczone z zapisanych serii, z przeliczeniem po edycji.
- AI generuj/optymalizuj w oparciu o istniejące ćwiczenia użytkowniczki, z limitem i walidacją JSON.

### 4.2 Poza zakresem MVP (explicit)

- Import treningów z URL.
- Multimedia (zdjęcia, animacje).
- Udostępnianie treningów innym użytkownikom.
- Funkcje społecznościowe.
- Zaawansowana analityka/KPI i dashboardy.
- Tworzenie nowych ćwiczeń przez AI (planowane później).
- Panel admina.

## 5. Historyjki użytkowników

### 5.1 Konta, dostęp, bezpieczeństwo

- ID: US-001
  Tytuł: Rejestracja/logowanie przez Supabase Auth
  Opis: Jako użytkowniczka chcę móc się zalogować do aplikacji, aby mieć prywatny dostęp do swoich ćwiczeń i treningów.
  Kryteria akceptacji:

  - Użytkowniczka może zalogować się używając formularza email/password i zakończyć proces logowania sukcesem.
  - Użytkowniczka może zarejestrować nowe konto używając formularza rejestracji.
  - Użytkowniczka może zresetować hasło, jeśli je zapomniała.
  - Po zalogowaniu aplikacja przechodzi do widoku głównego.
  - Po wylogowaniu dane użytkowniczki nie są widoczne.

- ID: US-002
  Tytuł: Izolacja danych użytkowników (RLS)
  Opis: Jako użytkowniczka chcę mieć pewność, że nikt nie zobaczy moich danych nawet przy próbie manipulacji identyfikatorami.
  Kryteria akceptacji:

  - Próba odczytu zasobu innego użytkownika (np. poprzez zmianę ID w URL lub zapytaniu) kończy się brakiem dostępu/brakiem danych.
  - Próba edycji/usunięcia zasobu innego użytkownika kończy się błędem autoryzacji.
  - Działa to niezależnie od UI (weryfikacja na poziomie bazy przez RLS).

- ID: US-003
  Tytuł: Sesja użytkownika i odświeżenie strony
  Opis: Jako użytkowniczka chcę pozostać zalogowana po odświeżeniu strony, aby nie tracić czasu.
  Kryteria akceptacji:
  - Po odświeżeniu przeglądarki użytkowniczka pozostaje zalogowana (jeśli sesja jest ważna).
  - Gdy sesja wygasła, aplikacja przekierowuje do logowania.

### 5.2 Ćwiczenia (CRUD)

- ID: US-010
  Tytuł: Dodanie ćwiczenia
  Opis: Jako użytkowniczka chcę dodać ćwiczenie do swojej biblioteki, aby móc budować z niego plany.
  Kryteria akceptacji:

  - Formularz umożliwia wpisanie title, wybór type i part.
  - Formularz wymaga podania co najmniej jednego z: time lub series lub reps lub rest lub restAfter.
  - Po zapisie ćwiczenie jest widoczne na liście.

- ID: US-011
  Tytuł: Walidacja unikalności tytułu ćwiczenia (case-insensitive)
  Opis: Jako użytkowniczka chcę uniknąć duplikatów ćwiczeń, aby biblioteka była uporządkowana.
  Kryteria akceptacji:

  - Jeśli istnieje ćwiczenie o tym samym tytule po normalizacji (trim + lowercase + redukcja spacji), zapis jest blokowany.
  - Aplikacja pokazuje komunikat o duplikacie.
  - Reguła działa niezależnie od wielkości liter i wielokrotnych spacji.

- ID: US-012
  Tytuł: Lista ćwiczeń
  Opis: Jako użytkowniczka chcę przeglądać listę ćwiczeń, aby szybko znaleźć potrzebne ćwiczenie.
  Kryteria akceptacji:

  - Lista pokazuje co najmniej title, type, part.
  - Lista wyświetla tylko ćwiczenia zalogowanej użytkowniczki.

- ID: US-016
  Tytuł: Pusty stan listy ćwiczeń
  Opis: Jako użytkowniczka chcę dostać jasny komunikat, gdy nie mam jeszcze ćwiczeń, abym wiedziała co zrobić dalej.
  Kryteria akceptacji:

  - Jeśli użytkowniczka nie ma żadnych ćwiczeń, lista pokazuje pusty stan i CTA do dodania ćwiczenia.
  - Pusty stan nie pokazuje danych innych użytkowników.

  - ID: US-013
    Tytuł: Wyświetlanie szczegółów ćwiczenia
    Opis: Jako użytkowniczka chcę wyświetlić szczegóły konkretnego ćwiczenia.
    Kryteria akceptacji:

  - Jeśli użytkowniczka nie ma żadnych ćwiczeń, nie ma moliwości przejścia do szczegółów.

- ID: US-017
  Tytuł: Edycja ćwiczenia
  Opis: Jako użytkowniczka chcę edytować ćwiczenie, aby poprawić opis lub parametry.
  Kryteria akceptacji:

  - Użytkowniczka może zmienić pola zgodnie z wymaganiami walidacyjnymi.
  - Zapis nie może stworzyć duplikatu title po normalizacji.
  - Po zapisie zmiany są widoczne na liście i w planach, które używają ćwiczenia (referencja po ID).

- ID: US-014
  Tytuł: Usuwanie ćwiczenia bez powiązań
  Opis: Jako użytkowniczka chcę móc usuwać niepotrzebne ćwiczenia, jeśli nie wpływa to na historię.
  Kryteria akceptacji:

  - Jeśli ćwiczenie nie ma powiązań z WorkoutSession/PR, można je usunąć.
  - Po usunięciu ćwiczenie znika z listy i nie jest dostępne w edytorze planu.

- ID: US-015
  Tytuł: Blokada usunięcia ćwiczenia z historią
  Opis: Jako użytkowniczka chcę zachować spójność historii i rekordów, nawet jeśli nie używam już ćwiczenia.
  Kryteria akceptacji:
  - Jeśli ćwiczenie ma powiązanie z jakąkolwiek WorkoutSession lub PR, usunięcie jest zablokowane.
  - Aplikacja pokazuje komunikat z powodem (np. “Ćwiczenie występuje w historii treningów”).

### 5.3 Plany treningowe (CRUD)

- ID: US-020
  Tytuł: Utworzenie planu treningowego
  Opis: Jako użytkowniczka chcę utworzyć plan treningu, aby móc go wielokrotnie wykonywać.
  Kryteria akceptacji:

  - Użytkowniczka może podać name i opcjonalnie description.
  - Do tworzenia planu wykorzystuje zapisane w swoim koncie pojedyncze ćwiczenia
  - Po zapisaniu plan pojawia się na liście planów.

- ID: US-026
  Tytuł: Walidacja planu bez ćwiczeń
  Opis: Jako użytkowniczka chcę, aby aplikacja nie pozwoliła mi zapisać lub uruchomić pustego planu.
  Kryteria akceptacji:

  - Zapis planu bez żadnych ćwiczeń jest zablokowany lub plan nie może zostać uruchomiony (jedno zachowanie konsekwentnie w całej aplikacji).
  - UI pokazuje komunikat o wymaganiu dodania co najmniej jednego ćwiczenia.

- ID: US-021
  Tytuł: Dodanie ćwiczeń do planu w stałej kolejności
  Opis: Jako użytkowniczka chcę dodać ćwiczenia do planu w określonej kolejności, aby asystent mógł mnie prowadzić.
  Kryteria akceptacji:

  - Użytkowniczka może wybrać ćwiczenia z własnej biblioteki.
  - Plan zapisuje ćwiczenia w kolejności dodania.
  - W MVP brak funkcji zmiany kolejności w ramach sesji; kolejność w planie determinuje sesję.

- ID: US-022
  Tytuł: Ustawienie domyślnych parametrów planu per ćwiczenie
  Opis: Jako użytkowniczka chcę zapisać planowane parametry ćwiczeń, aby mieć bazę do wykonania.
  Kryteria akceptacji:

  - Dla każdego ćwiczenia w planie można ustawić planned\_\* (np. planned_sets/reps/duration/rest/restAfter).
  - Walidacja pozwala pominąć nieadekwatne pola zależnie od typu ćwiczenia (np. izometria może mieć duration).
  - Parametry są widoczne w asystencie sesji jako “planowane”.

- ID: US-023
  Tytuł: Edycja planu treningowego
  Opis: Jako użytkowniczka chcę edytować plan, aby zmienić listę ćwiczeń lub parametry.
  Kryteria akceptacji:

  - Można zmienić metadane planu oraz skład planu.
  - Zmiany wpływają na przyszłe sesje; już zapisane sesje nie zmieniają się (mają własną kopię).

- ID: US-024
  Tytuł: Usunięcie planu treningowego
  Opis: Jako użytkowniczka chcę usuwać plany, które nie są mi potrzebne.
  Kryteria akceptacji:

  - Plan można usunąć.
  - Usunięcie planu nie usuwa historii sesji (WorkoutSession pozostaje w historii jako zapis wykonania).

- ID: US-025
  Tytuł: Lista planów treningowych
  Opis: Jako użytkowniczka chcę przeglądać plany, aby szybko wybrać trening.
  Kryteria akceptacji:
  - Lista zawiera name, part oraz liczbę ćwiczeń.
  - Widoczne są tylko plany użytkowniczki.

### 5.4 Asystent sesji treningowej (WorkoutSession)

- ID: US-030
  Tytuł: Rozpoczęcie sesji z planu
  Opis: Jako użytkowniczka chcę rozpocząć sesję na podstawie planu, aby aplikacja poprowadziła mnie przez ćwiczenia.
  Kryteria akceptacji:

  - Kliknięcie “Start” tworzy WorkoutSession ze statusem in_progress.
  - Sesja zawiera listę ćwiczeń z planu w tej samej kolejności.
  - Dla każdego ćwiczenia sesja ma planned\_\* skopiowane z planu.

- ID: US-031
  Tytuł: Timer globalny sesji
  Opis: Jako użytkowniczka chcę widzieć czas trwania sesji, aby kontrolować trening.
  Kryteria akceptacji:

  - Timer startuje przy rozpoczęciu sesji.
  - Pause zatrzymuje timer, a wznowienie kontynuuje od zatrzymanego czasu.

- ID: US-032
  Tytuł: Wyświetlenie bieżącego ćwiczenia z parametrami planowanymi
  Opis: Jako użytkowniczka chcę widzieć planowane parametry ćwiczenia, aby wiedzieć co wykonać.
  Kryteria akceptacji:

  - Widok bieżącego ćwiczenia pokazuje title, type, part i planned\_\*.
  - Jeśli ćwiczenie jest unilateralne, UI może wskazywać “wykonaj na prawo i lewo”, ale dane nie rozróżniają stron.

- ID: US-033
  Tytuł: Zapis faktycznego wykonania ćwiczenia (actual\_\*)
  Opis: Jako użytkowniczka chcę móc wpisać faktyczne wykonanie, gdy różni się od planu.
  Kryteria akceptacji:

  - Użytkowniczka może wprowadzić actual\_\* dla ćwiczenia (np. actual_sets/reps/duration/weight/rest, zgodnie z formatem set logs).
  - Dane są zapisywane w sesji przy użyciu next lub pause (autosave).
  - Jeśli dane nie są nadpisywane kopiują wartości z pola planned\_\* do actual\_\*

- ID: US-034
  Tytuł: Nawigacja next zapisuje stan ćwiczenia
  Opis: Jako użytkowniczka chcę, aby przejście dalej zapisało moje dane i przeniosło mnie do kolejnego ćwiczenia.
  Kryteria akceptacji:

  - Kliknięcie next zapisuje aktualne dane ćwiczenia (planned*\* i actual*\* oraz set logs).
  - Po zapisie aplikacja przechodzi do następnego ćwiczenia.
  - Jeśli zapis się nie uda, aplikacja pokazuje błąd i nie przechodzi dalej.

- ID: US-035
  Tytuł: Nawigacja previous do poprzedniego ćwiczenia
  Opis: Jako użytkowniczka chcę wrócić do poprzedniego ćwiczenia, aby je podejrzeć lub wykonać później.
  Kryteria akceptacji:

  - Kliknięcie previous przenosi do poprzedniego ćwiczenia na liście.
  - Dane zapisane wcześniej są widoczne w formularzu.

- ID: US-036
  Tytuł: Skip ćwiczenia
  Opis: Jako użytkowniczka chcę pominąć ćwiczenie, jeśli nie mogę go wykonać.
  Kryteria akceptacji:

  - Kliknięcie skip oznacza ćwiczenie jako pominięte w ramach sesji i przechodzi do następnego.
  - Skip nie tworzy set logs, jeśli użytkowniczka nic nie zapisała dla tego ćwiczenia.
  - Sesja może zostać ukończona mimo pominięć.
  - Skip takze działa jako autosave dla biezacego stanu sesji

- ID: US-037
  Tytuł: Autosave przy pauzie
  Opis: Jako użytkowniczka chcę nie tracić danych, gdy robię przerwę.
  Kryteria akceptacji:

  - Kliknięcie pause zapisuje bieżący stan sesji.
  - Po wznowieniu dane pozostają dostępne.

- ID: US-038
  Tytuł: Wznowienie przerwanej sesji
  Opis: Jako użytkowniczka chcę wznowić sesję in_progress, aby dokończyć trening.
  Kryteria akceptacji:

  - Jeśli istnieje sesja in_progress, aplikacja oferuje opcję wznowienia.
  - Wznowienie przenosi użytkowniczkę do ostatniego miejsca w sesji (ostatnio aktywne ćwiczenie lub następne po zapisanym).

- ID: US-042
  Tytuł: Blokada startu nowej sesji przy in_progress
  Opis: Jako użytkowniczka chcę uniknąć sytuacji, w której mam kilka “rozgrzebanych” treningów naraz.
  Kryteria akceptacji:

  - Jeśli istnieje sesja in_progress, próba rozpoczęcia nowej sesji jest blokowana lub przekierowuje do wznowienia istniejącej sesji (z komunikatem).
  - Aplikacja nie tworzy drugiej sesji in_progress.

- ID: US-043
  Tytuł: Obsługa błędu autosave/next przy problemach z siecią
  Opis: Jako użytkowniczka chcę nie stracić danych, gdy zapis chwilowo nie działa.
  Kryteria akceptacji:

  - Jeśli zapis przy next/pause nie powiedzie się, aplikacja pokazuje błąd i nie przechodzi do następnego ćwiczenia.
  - Wprowadzone dane pozostają w formularzu (nie znikają po błędzie).

- ID: US-039
  Tytuł: Zakończenie sesji po dotarciu do końca listy
  Opis: Jako użytkowniczka chcę ukończyć sesję, gdy przejdę przez wszystkie ćwiczenia.
  Kryteria akceptacji:

  - Po przejściu przez ostatnie ćwiczenie i wykonaniu next, sesja uzyskuje status completed.
  - Completed jest możliwe nawet, jeśli w sesji wystąpiły skip.

- ID: US-040
  Tytuł: Przypadek przerwania sesji bez ukończenia
  Opis: Jako użytkowniczka chcę móc przerwać sesję i wrócić później.
  Kryteria akceptacji:

  - Jeśli użytkowniczka opuści asystenta przed końcem listy, sesja pozostaje in_progress.
  - Aplikacja umożliwia wznowienie tej sesji.

- ID: US-041
  Tytuł: Edycja danych wcześniejszego ćwiczenia i nadpisanie logów
  Opis: Jako użytkowniczka chcę poprawić zapis wykonania, jeśli wcześniej wpisałam błędne wartości.
  Kryteria akceptacji:
  - Użytkowniczka może przejść previous do wcześniej odwiedzonego ćwiczenia.
  - Po zmianie i przejściu next log jest nadpisany.
  - PR zostaje przeliczony z aktualnych danych.

### 5.5 Set logs (log per seria) i walidacje

- ID: US-050
  Tytuł: Wprowadzanie logów per seria
  Opis: Jako użytkowniczka chcę zapisać wykonanie w podziale na serie, aby PR były wiarygodne.
  Kryteria akceptacji:

  - UI pozwala dodać i edytować listę serii dla ćwiczenia (set logs).
  - Każda seria umożliwia wprowadzenie wartości takich jak reps/time/weight (zgodnie z docelowym formatem).
  - Nie ma moliwości wprowadzania zmian do rest i restAfter, odpoczynek nie jest tu kluczowy pod względem weryfikacji wykonania i aktualizowania PR
  - Dane są zapisywane w sesji przy next/pause/skip.

- ID: US-051
  Tytuł: Walidacja minimalnych danych w serii
  Opis: Jako użytkowniczka chcę, aby aplikacja nie zapisała pustej serii, która psuje PR.
  Kryteria akceptacji:

  - System blokuje zapis serii bez żadnych wartości roboczych (np. wszystkie pola puste).
  - Komunikat walidacyjny wskazuje, które pola wymagają uzupełnienia.
  - Przy pominięciu ćwiczenia skip wpisuje do historii biezacej sesji reps lub time jako 0

### 5.6 PR (rekordy)

- ID: US-060
  Tytuł: Automatyczne wykrywanie PR po zapisie serii
  Opis: Jako użytkowniczka chcę, aby aplikacja wykryła nowy rekord, gdy zapiszę lepszy (wieksza liczba) wynik.
  Kryteria akceptacji:

  - Po zapisie sesji system porównuje nowe set logs z dotychczasowym PR dla danego ćwiczenia.
  - Jeśli wynik jest lepszy według reguł PR, system zapisuje nowy PR i oznacza go jako “nowy”.

- ID: US-061
  Tytuł: PR liczone z częściowo wykonanych sesji
  Opis: Jako użytkowniczka chcę, aby rekordy z częściowego treningu też były uwzględniane, jeśli zapisałam serie.
  Kryteria akceptacji:

  - PR są aktualizowane na podstawie set logs zapisanych w sesji in_progress, jeśli dane zostały zatwierdzone przez next.
  - Brak wymogu ukończenia sesji, aby PR zostały uwzględnione.

- ID: US-062
  Tytuł: Przeliczenie PR po edycji wcześniejszych danych
  Opis: Jako użytkowniczka chcę, aby korekta logów zmieniła rekordy, jeśli ma na to wpływ.
  Kryteria akceptacji:

  - Po nadpisaniu logów serii system przelicza PR dla danego ćwiczenia.
  - Jeśli wcześniejszy PR przestaje być najlepszy, system aktualizuje PR do poprawnej wartości wynikającej z danych.
  - PR posiada oprócz samego rekordu take datę jego wykonania.

- ID: US-063
  Tytuł: Widok listy PR
  Opis: Jako użytkowniczka chcę zobaczyć moje rekordy, aby śledzić postępy.
  Kryteria akceptacji:
  - Widok PR pokazuje listę ćwiczeń z aktualnym rekordem i datą.
  - Widok zawiera co najmniej: tytuł ćwiczenia oraz najlepszą wartość dla dostępnych typów rekordów (max_reps/max_duration/max_weight).
  - Widok pokazuje tylko dane użytkowniczki.
  - Jeśli seria określa 3 serie po kilka powtórzeń np. 4 3 3, to wykonanie 5 3 3 będzie PR, a takze wykonanie 4 4 3 bedzie rekordem, jeśli ćwiczenie wykonywane jest w seriach to PR bierze pod uwagę całość czyli wszystkie serie, nie pojedyncze serie z danego zestawu.

### 5.7 Historia treningów

- ID: US-070
  Tytuł: Lista historii sesji
  Opis: Jako użytkowniczka chcę widzieć wszystkie sesje, aby móc do nich wrócić.
  Kryteria akceptacji:

  - Lista pokazuje datę, nazwę planu oraz status (in_progress/completed).
  - Użytkowniczka może przejść do szczegółów wybranej sesji.

- ID: US-071
  Tytuł: Szczegóły sesji z planned vs actual
  Opis: Jako użytkowniczka chcę widzieć różnice pomiędzy planem a wykonaniem.
  Kryteria akceptacji:

  - Widok sesji pokazuje listę ćwiczeń w kolejności z sesji.
  - Dla każdego ćwiczenia widoczne są planned*\* i actual*\* oraz set logs.

- ID: US-072
  Tytuł: Zachowanie historii przy usunięciu planu
  Opis: Jako użytkowniczka chcę usunąć plan bez kasowania historii jego wykonań.
  Kryteria akceptacji:
  - Po usunięciu planu sesje historyczne nadal są widoczne i spójne.
  - Sesja pokazuje nazwę planu z dopiskiem np. “Plan usunięty”, bez błędów.

### 5.8 AI: generuj i optymalizuj - do wdrozenia po wykonaniu planu podstawowego

- ID: US-080
  Tytuł: Formularz “na żądanie” do generowania treningu
  Opis: Jako użytkowniczka chcę podać parametry (cel/poziom/czas/partie/sprzęt), aby otrzymać propozycję treningu.
  Kryteria akceptacji:

  - Formularz zawiera pola: cel, poziom, czas, partie, sprzęt.
  - Po wysłaniu system rozpoczyna wywołanie AI i pokazuje stan ładowania.

- ID: US-081
  Tytuł: Generowanie planu tylko z moich ćwiczeń
  Opis: Jako użytkowniczka chcę, aby AI używało wyłącznie ćwiczeń z mojej biblioteki.
  Kryteria akceptacji:

  - Odpowiedź AI jest walidowana: każdy exercise_id musi należeć do użytkowniczki.
  - Jeśli AI zwróci exercise_id spoza biblioteki, system odrzuca wynik i pokazuje błąd.

- ID: US-082
  Tytuł: Optymalizacja istniejącego planu przez AI
  Opis: Jako użytkowniczka chcę zoptymalizować istniejący plan, aby lepiej pasował do parametrów.
  Kryteria akceptacji:

  - Użytkowniczka może wybrać plan do optymalizacji.
  - System wysyła do AI tylko niezbędne dane: parametry formularza + plan.
  - Zwrócony plan jest walidowany jak w generowaniu.

- ID: US-083
  Tytuł: Kontrakt JSON i obsługa błędów formatu
  Opis: Jako użytkowniczka chcę dostać czytelny komunikat, gdy AI zwróci błędny format.
  Kryteria akceptacji:

  - Jeśli JSON jest niepoprawny lub nie przechodzi walidacji, aplikacja pokazuje komunikat o błędzie.
  - Aplikacja nie zapisuje częściowo niepoprawnego planu.

- ID: US-084
  Tytuł: Limit 5 akcji AI na miesiąc na użytkownika
  Opis: Jako użytkowniczka chcę wiedzieć, ile mam pozostałych użyć AI, aby kontrolować limit.
  Kryteria akceptacji:

  - System blokuje wywołanie AI po przekroczeniu limitu.
  - UI pokazuje informację o pozostałych użyciach oraz dacie resetu (1. dzień miesiąca).

- ID: US-087
  Tytuł: Blokada użycia AI, gdy brak ćwiczeń
  Opis: Jako użytkowniczka chcę wiedzieć, że AI nie zadziała bez mojej biblioteki ćwiczeń.
  Kryteria akceptacji:

  - Jeśli użytkowniczka nie ma żadnych ćwiczeń, AI generuj/optymalizuj jest zablokowane.
  - UI pokazuje komunikat i prowadzi do dodania pierwszego ćwiczenia.

- ID: US-085
  Tytuł: Retry nie liczy się przy błędzie systemowym
  Opis: Jako użytkowniczka chcę ponowić próbę, jeśli system zawiedzie, bez utraty limitu.
  Kryteria akceptacji:

  - Jeśli wywołanie zakończyło się błędem systemowym, ponowienie nie zmniejsza limitu.
  - Jeśli wywołanie zakończyło się poprawnie (nawet z odrzuconym planem z powodu walidacji), traktowane jest jako zużycie limitu.

- ID: US-086
  Tytuł: Logowanie wywołań AI bez danych identyfikujących
  Opis: Jako właścicielka projektu chcę móc debugować problemy AI bez utrwalania PII.
  Kryteria akceptacji:
  - System zapisuje: parametry wejściowe (bez PII), response JSON, error codes i timestamp.
  - System nie zapisuje danych identyfikujących użytkowniczkę w payloadzie do AI.

### 5.9 Usuwanie i spójność danych

- ID: US-090
  Tytuł: Blokada usunięcia ćwiczenia z powiązaniami w sesjach/PR
  Opis: Jako użytkowniczka chcę zachować spójność historii i rekordów.
  Kryteria akceptacji:
  - Próba usunięcia ćwiczenia powiązanego z WorkoutSession lub PR jest blokowana.
  - UI pokazuje jasny komunikat, dlaczego nie można usunąć.

## 6. Metryki sukcesu

### 6.1 Metryki biznesowe

W MVP rezygnujemy z formalnych KPI i analityki produktu.

### 6.2 Metryki jakościowe (Definition of Done MVP)

MVP uznajemy za działające, gdy:

- CRUD ćwiczeń i planów działa dla zalogowanego użytkownika, z walidacjami i unikalnością title.
- Asystent sesji tworzy, zapisuje i wznawia sesje, a statusy in_progress/completed działają zgodnie z definicją.
- Autosave minimalizuje utratę danych przy przerwaniach.
- PR wyliczane są deterministycznie na podstawie set logs i przeliczają się po edycji.
- RLS skutecznie izoluje dane użytkowników.
- Integracja AI (po wdrożeniu) działa przez endpoint serwerowy, respektuje limit, waliduje JSON i nie wysyła PII.

### 6.3 Checklist po ukończeniu PRD (weryfikacja kompletności historyjek)

- Czy każdą historię użytkownika można przetestować?
- Czy kryteria akceptacji są jasne i konkretne?
- Czy historyjki pokrywają scenariusze podstawowe, alternatywne i skrajne?
- Czy uwzględniono uwierzytelnianie i autoryzację (RLS) oraz brak dostępu do cudzych danych?
