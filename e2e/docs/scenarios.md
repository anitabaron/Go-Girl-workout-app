# E2E Scenarios

Poniżej numerowana lista scenariuszy E2E dodanych dla ostatnich zmian (statistics, scope, i18n, zapis rekordów).

## Top 5 (aktualna paczka)

1. `E2E-STAT-001`  
Scenariusz: otwarcie modala szczegółów sesji z kalendarza `statistics`.  
Zakres: kliknięcie sesji w kalendarzu, weryfikacja pól szczegółów (data, czas, liczba ćwiczeń, link do szczegółów sesji).  
Plik: `e2e/statistics/statistics.spec.ts`

2. `E2E-STAT-002`  
Scenariusz: użycie akcji `repeat plan` z modala w `statistics`.  
Zakres: kliknięcie `Do this plan again / Wykonaj ten plan jeszcze raz`, weryfikacja przekierowania na `/workout-sessions/:id/active`.  
Plik: `e2e/statistics/statistics.spec.ts`

3. `E2E-I18N-001`  
Scenariusz: trwałość zmiany języka po reloadzie i przejściu między stronami.  
Zakres: przełączenie na EN na `statistics`, przejście na inną stronę i powrót, reload, weryfikacja że EN pozostaje aktywny.  
Plik: `e2e/statistics/statistics.spec.ts`

4. `E2E-SCOPE-002`  
Scenariusz: mieszany układ `single + scope + single` z ruchem scope góra/dół i zmianą kolejności ćwiczeń w scope.  
Zakres: dodanie scope, wymuszenie kolizji kolejności, ruch scope `up/down`, reorder w scope, zapis planu bez błędu walidacji.  
Plik: `e2e/workout-plans/edit-workout-plan-scope.spec.ts`

5. `E2E-SCOPE-003`  
Scenariusz: zmiana `section_type` dla ćwiczeń należących do scope i zapis planu.  
Zakres: scope z 2 ćwiczeń, zmiana typu sekcji na `Warm-up`, zapis bez błędu walidacji.  
Plik: `e2e/workout-plans/edit-workout-plan-scope.spec.ts`

## Dodatkowe regresje w tym samym obszarze

1. `E2E-SCOPE-001`  
Scenariusz: podstawowa regresja scope reorder (`section_order` + reorder wewnątrz scope) i zapis planu.  
Plik: `e2e/workout-plans/edit-workout-plan-scope.spec.ts`

2. `STAT-AUTH-001`  
Scenariusz: `statistics` jako ścieżka prywatna.  
Zakres: niezalogowany użytkownik jest przekierowany na `/login`.  
Plik: `e2e/statistics/statistics.spec.ts`
