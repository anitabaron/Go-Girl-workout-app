# Schemat bazy danych PostgreSQL - Go Girl Workout App

## 1. Typy wyliczeniowe (Enums)

```sql
-- Typ ćwiczenia
CREATE TYPE exercise_type AS ENUM ('Warm-up', 'Main Workout', 'Cool-down');

-- Partia mięśniowa
CREATE TYPE exercise_part AS ENUM ('Legs', 'Core', 'Back', 'Arms', 'Chest');

-- Status sesji treningowej
CREATE TYPE workout_session_status AS ENUM ('in_progress', 'completed');

-- Typ metryki PR
CREATE TYPE pr_metric_type AS ENUM ('total_reps', 'max_duration', 'max_weight');

-- Typ akcji AI
CREATE TYPE ai_request_type AS ENUM ('generate', 'optimize');
```

## 2. Tabele

### 2.1 `exercises` - Biblioteka ćwiczeń użytkownika

```sql
CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    title_normalized TEXT NOT NULL GENERATED ALWAYS AS (
        lower(trim(regexp_replace(title, '\s+', ' ', 'g')))
    ) STORED,
    type exercise_type NOT NULL,
    part exercise_part NOT NULL,
    level TEXT,
    details TEXT,
    -- Metryki: wymagane co najmniej jedno z reps lub duration
    reps INTEGER CHECK (reps IS NULL OR reps > 0),
    duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds > 0),
    -- Serie: wymagane
    series INTEGER NOT NULL CHECK (series > 0),
    -- Odpoczynek: wymagane co najmniej jedno z rest_in_between lub rest_after_series
    rest_in_between_seconds INTEGER CHECK (rest_in_between_seconds IS NULL OR rest_in_between_seconds >= 0),
    rest_after_series_seconds INTEGER CHECK (rest_after_series_seconds IS NULL OR rest_after_series_seconds >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Walidacja: co najmniej jedno z reps lub duration
    CONSTRAINT exercises_metric_check CHECK (
        (reps IS NOT NULL AND duration_seconds IS NULL) OR
        (reps IS NULL AND duration_seconds IS NOT NULL)
    ),
    -- Walidacja: co najmniej jedno z rest_in_between lub rest_after_series
    CONSTRAINT exercises_rest_check CHECK (
        rest_in_between_seconds IS NOT NULL OR rest_after_series_seconds IS NOT NULL
    ),
    -- Unikalność tytułu per użytkownik (case-insensitive)
    CONSTRAINT exercises_unique_title UNIQUE (user_id, title_normalized)
);

-- Indeksy
CREATE INDEX idx_exercises_user_id ON exercises(user_id);
CREATE INDEX idx_exercises_user_id_title_normalized ON exercises(user_id, title_normalized);
CREATE INDEX idx_exercises_user_id_part ON exercises(user_id, part);
CREATE INDEX idx_exercises_user_id_type ON exercises(user_id, type);

-- Trigger do aktualizacji updated_at
CREATE TRIGGER exercises_updated_at
    BEFORE UPDATE ON exercises
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 2.2 `workout_plans` - Szablony planów treningowych

```sql
CREATE TABLE workout_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    part exercise_part,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indeksy
CREATE INDEX idx_workout_plans_user_id ON workout_plans(user_id);
CREATE INDEX idx_workout_plans_user_id_created_at ON workout_plans(user_id, created_at DESC);

-- Trigger do aktualizacji updated_at
CREATE TRIGGER workout_plans_updated_at
    BEFORE UPDATE ON workout_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 2.3 `workout_plan_exercises` - Ćwiczenia w planie treningowym

```sql
CREATE TABLE workout_plan_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
    section_type exercise_type NOT NULL,
    section_order INTEGER NOT NULL CHECK (section_order > 0),
    -- Parametry planu (mogą być NULL, kopiowane z ćwiczenia jako domyślne)
    planned_sets INTEGER CHECK (planned_sets IS NULL OR planned_sets > 0),
    planned_reps INTEGER CHECK (planned_reps IS NULL OR planned_reps > 0),
    planned_duration_seconds INTEGER CHECK (planned_duration_seconds IS NULL OR planned_duration_seconds > 0),
    planned_rest_seconds INTEGER CHECK (planned_rest_seconds IS NULL OR planned_rest_seconds >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Unikalność kolejności w sekcji
    CONSTRAINT workout_plan_exercises_unique_order
        UNIQUE (plan_id, section_type, section_order)
);

-- Indeksy
CREATE INDEX idx_workout_plan_exercises_plan_id ON workout_plan_exercises(plan_id);
CREATE INDEX idx_workout_plan_exercises_exercise_id ON workout_plan_exercises(exercise_id);
CREATE INDEX idx_workout_plan_exercises_plan_section_order ON workout_plan_exercises(plan_id, section_type, section_order);
```

### 2.4 `workout_sessions` - Sesje treningowe

```sql
CREATE TABLE workout_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workout_plan_id UUID REFERENCES workout_plans(id) ON DELETE SET NULL,
    status workout_session_status NOT NULL DEFAULT 'in_progress',
    -- Snapshot planu w momencie rozpoczęcia sesji
    plan_name_at_time TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    -- Śledzenie wznowienia sesji
    current_position INTEGER DEFAULT 0 CHECK (current_position >= 0),
    last_action_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Ograniczenie: tylko jedna sesja in_progress per użytkownik
    CONSTRAINT workout_sessions_one_in_progress
        UNIQUE (user_id)
        WHERE status = 'in_progress'
);

-- Indeksy
CREATE INDEX idx_workout_sessions_user_id ON workout_sessions(user_id);
CREATE INDEX idx_workout_sessions_user_id_started_at ON workout_sessions(user_id, started_at DESC);
CREATE INDEX idx_workout_sessions_user_id_status ON workout_sessions(user_id, status);
CREATE INDEX idx_workout_sessions_workout_plan_id ON workout_sessions(workout_plan_id);

-- Partial unique index dla sesji in_progress (dodatkowe zabezpieczenie)
CREATE UNIQUE INDEX idx_workout_sessions_user_in_progress
    ON workout_sessions(user_id)
    WHERE status = 'in_progress';
```

### 2.5 `workout_session_exercises` - Ćwiczenia w sesji treningowej

```sql
CREATE TABLE workout_session_exercises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
    -- Snapshot ćwiczenia w momencie rozpoczęcia sesji
    exercise_title_at_time TEXT NOT NULL,
    exercise_type_at_time exercise_type NOT NULL,
    exercise_part_at_time exercise_part NOT NULL,
    -- Parametry planowane (skopiowane z planu lub ćwiczenia)
    planned_sets INTEGER CHECK (planned_sets IS NULL OR planned_sets > 0),
    planned_reps INTEGER CHECK (planned_reps IS NULL OR planned_reps > 0),
    planned_duration_seconds INTEGER CHECK (planned_duration_seconds IS NULL OR planned_duration_seconds > 0),
    planned_rest_seconds INTEGER CHECK (planned_rest_seconds IS NULL OR planned_rest_seconds >= 0),
    -- Parametry faktyczne (domyślnie z planned_*, edytowalne)
    actual_sets INTEGER CHECK (actual_sets IS NULL OR actual_sets >= 0),
    actual_reps INTEGER CHECK (actual_reps IS NULL OR actual_reps >= 0),
    actual_duration_seconds INTEGER CHECK (actual_duration_seconds IS NULL OR actual_duration_seconds >= 0),
    actual_rest_seconds INTEGER CHECK (actual_rest_seconds IS NULL OR actual_rest_seconds >= 0),
    -- Kolejność w sesji
    "order" INTEGER NOT NULL CHECK ("order" > 0),
    -- Flaga pominięcia ćwiczenia
    is_skipped BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Unikalność kolejności w sesji
    CONSTRAINT workout_session_exercises_unique_order
        UNIQUE (session_id, "order")
);

-- Indeksy
CREATE INDEX idx_workout_session_exercises_session_id ON workout_session_exercises(session_id);
CREATE INDEX idx_workout_session_exercises_exercise_id ON workout_session_exercises(exercise_id);
CREATE INDEX idx_workout_session_exercises_session_order ON workout_session_exercises(session_id, "order");

-- Trigger do aktualizacji updated_at
CREATE TRIGGER workout_session_exercises_updated_at
    BEFORE UPDATE ON workout_session_exercises
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 2.6 `workout_session_sets` - Serie w ćwiczeniu sesji

```sql
CREATE TABLE workout_session_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_exercise_id UUID NOT NULL REFERENCES workout_session_exercises(id) ON DELETE CASCADE,
    set_number INTEGER NOT NULL CHECK (set_number > 0),
    -- Metryki: co najmniej jedna niepusta
    reps INTEGER CHECK (reps IS NULL OR reps >= 0),
    duration_seconds INTEGER CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
    weight_kg NUMERIC(6, 2) CHECK (weight_kg IS NULL OR weight_kg >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Walidacja: co najmniej jedna metryka niepusta
    CONSTRAINT workout_session_sets_metric_check CHECK (
        reps IS NOT NULL OR duration_seconds IS NOT NULL OR weight_kg IS NOT NULL
    ),
    -- Unikalność numeru serii w ćwiczeniu
    CONSTRAINT workout_session_sets_unique_number
        UNIQUE (session_exercise_id, set_number)
);

-- Indeksy
CREATE INDEX idx_workout_session_sets_session_exercise_id ON workout_session_sets(session_exercise_id);
CREATE INDEX idx_workout_session_sets_for_pr_calculation ON workout_session_sets(session_exercise_id, reps, duration_seconds, weight_kg);

-- Trigger do aktualizacji updated_at
CREATE TRIGGER workout_session_sets_updated_at
    BEFORE UPDATE ON workout_session_sets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 2.7 `personal_records` - Materializowane rekordy osobiste

```sql
CREATE TABLE personal_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
    metric_type pr_metric_type NOT NULL,
    -- Wartość rekordu
    value NUMERIC(10, 2) NOT NULL CHECK (value >= 0),
    -- Metadane rekordu
    achieved_at TIMESTAMPTZ NOT NULL,
    achieved_in_session_id UUID REFERENCES workout_sessions(id) ON DELETE SET NULL,
    achieved_in_set_number INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Unikalność: jeden rekord per ćwiczenie per typ metryki per użytkownik
    CONSTRAINT personal_records_unique
        UNIQUE (user_id, exercise_id, metric_type)
);

-- Indeksy
CREATE INDEX idx_personal_records_user_id ON personal_records(user_id);
CREATE INDEX idx_personal_records_exercise_id ON personal_records(exercise_id);
CREATE INDEX idx_personal_records_user_exercise_metric ON personal_records(user_id, exercise_id, metric_type);
CREATE INDEX idx_personal_records_user_id_achieved_at ON personal_records(user_id, achieved_at DESC);

-- Trigger do aktualizacji updated_at
CREATE TRIGGER personal_records_updated_at
    BEFORE UPDATE ON personal_records
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 2.8 `ai_usage` - Limit użycia AI (5/miesiąc)

```sql
CREATE TABLE ai_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month_year DATE NOT NULL, -- Format: YYYY-MM-01 (pierwszy dzień miesiąca)
    usage_count INTEGER NOT NULL DEFAULT 0 CHECK (usage_count >= 0 AND usage_count <= 5),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Unikalność: jeden wiersz per użytkownik per miesiąc
    CONSTRAINT ai_usage_unique UNIQUE (user_id, month_year)
);

-- Indeksy
CREATE INDEX idx_ai_usage_user_id ON ai_usage(user_id);
CREATE INDEX idx_ai_usage_user_month ON ai_usage(user_id, month_year);

-- Trigger do aktualizacji updated_at
CREATE TRIGGER ai_usage_updated_at
    BEFORE UPDATE ON ai_usage
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
```

### 2.9 `ai_requests` - Log wywołań AI

```sql
CREATE TABLE ai_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    request_type ai_request_type NOT NULL,
    -- Parametry wejściowe (bez PII)
    input_params JSONB,
    -- Odpowiedź AI (JSON)
    response_json JSONB,
    -- Informacje o błędzie
    error_code TEXT,
    error_message TEXT,
    is_system_error BOOLEAN NOT NULL DEFAULT false,
    -- Powiązanie z planem (jeśli dotyczy)
    workout_plan_id UUID REFERENCES workout_plans(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indeksy
CREATE INDEX idx_ai_requests_user_id ON ai_requests(user_id);
CREATE INDEX idx_ai_requests_user_id_created_at ON ai_requests(user_id, created_at DESC);
CREATE INDEX idx_ai_requests_is_system_error ON ai_requests(is_system_error);
CREATE INDEX idx_ai_requests_workout_plan_id ON ai_requests(workout_plan_id);
```

## 3. Funkcje pomocnicze

### 3.1 `update_updated_at_column()` - Automatyczna aktualizacja updated_at

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### 3.2 `recalculate_pr_for_exercise()` - Przeliczenie PR dla ćwiczenia

```sql
CREATE OR REPLACE FUNCTION recalculate_pr_for_exercise(
    p_user_id UUID,
    p_exercise_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_total_reps INTEGER;
    v_max_duration INTEGER;
    v_max_weight NUMERIC(6, 2);
    v_achieved_at TIMESTAMPTZ;
    v_session_id UUID;
    v_set_number INTEGER;
BEGIN
    -- Oblicz total_reps (suma wszystkich serii dla ćwiczenia)
    SELECT
        COALESCE(SUM(wss.reps), 0),
        MAX(wse.updated_at)
    INTO v_total_reps, v_achieved_at
    FROM workout_session_exercises wse
    JOIN workout_session_sets wss ON wss.session_exercise_id = wse.id
    WHERE wse.exercise_id = p_exercise_id
        AND wse.session_id IN (
            SELECT id FROM workout_sessions WHERE user_id = p_user_id
        )
        AND wss.reps IS NOT NULL
        AND wss.reps > 0;

    -- Aktualizuj lub wstaw total_reps PR
    IF v_total_reps > 0 THEN
        INSERT INTO personal_records (
            user_id, exercise_id, metric_type, value,
            achieved_at, achieved_in_session_id, achieved_in_set_number
        )
        SELECT
            p_user_id, p_exercise_id, 'total_reps'::pr_metric_type, v_total_reps,
            v_achieved_at, wse.session_id, MAX(wss.set_number)
        FROM workout_session_exercises wse
        JOIN workout_session_sets wss ON wss.session_exercise_id = wse.id
        WHERE wse.exercise_id = p_exercise_id
            AND wse.session_id IN (
                SELECT id FROM workout_sessions WHERE user_id = p_user_id
            )
            AND wss.reps IS NOT NULL
            AND wss.reps > 0
        GROUP BY wse.session_id
        HAVING SUM(wss.reps) = v_total_reps
        ORDER BY wse.updated_at DESC
        LIMIT 1
        ON CONFLICT (user_id, exercise_id, metric_type)
        DO UPDATE SET
            value = EXCLUDED.value,
            achieved_at = EXCLUDED.achieved_at,
            achieved_in_session_id = EXCLUDED.achieved_in_session_id,
            achieved_in_set_number = EXCLUDED.achieved_in_set_number,
            updated_at = now();
    END IF;

    -- Oblicz max_duration (maksimum z pojedynczej serii)
    SELECT
        MAX(wss.duration_seconds),
        MAX(wse.updated_at)
    INTO v_max_duration, v_achieved_at
    FROM workout_session_exercises wse
    JOIN workout_session_sets wss ON wss.session_exercise_id = wse.id
    WHERE wse.exercise_id = p_exercise_id
        AND wse.session_id IN (
            SELECT id FROM workout_sessions WHERE user_id = p_user_id
        )
        AND wss.duration_seconds IS NOT NULL
        AND wss.duration_seconds > 0;

    -- Aktualizuj lub wstaw max_duration PR
    IF v_max_duration > 0 THEN
        INSERT INTO personal_records (
            user_id, exercise_id, metric_type, value,
            achieved_at, achieved_in_session_id, achieved_in_set_number
        )
        SELECT
            p_user_id, p_exercise_id, 'max_duration'::pr_metric_type, v_max_duration,
            wse.updated_at, wse.session_id, wss.set_number
        FROM workout_session_exercises wse
        JOIN workout_session_sets wss ON wss.session_exercise_id = wse.id
        WHERE wse.exercise_id = p_exercise_id
            AND wse.session_id IN (
                SELECT id FROM workout_sessions WHERE user_id = p_user_id
            )
            AND wss.duration_seconds = v_max_duration
            AND wss.duration_seconds > 0
        ORDER BY wse.updated_at DESC
        LIMIT 1
        ON CONFLICT (user_id, exercise_id, metric_type)
        DO UPDATE SET
            value = EXCLUDED.value,
            achieved_at = EXCLUDED.achieved_at,
            achieved_in_session_id = EXCLUDED.achieved_in_session_id,
            achieved_in_set_number = EXCLUDED.achieved_in_set_number,
            updated_at = now();
    END IF;

    -- Oblicz max_weight (maksimum z pojedynczej serii)
    SELECT
        MAX(wss.weight_kg),
        MAX(wse.updated_at)
    INTO v_max_weight, v_achieved_at
    FROM workout_session_exercises wse
    JOIN workout_session_sets wss ON wss.session_exercise_id = wse.id
    WHERE wse.exercise_id = p_exercise_id
        AND wse.session_id IN (
            SELECT id FROM workout_sessions WHERE user_id = p_user_id
        )
        AND wss.weight_kg IS NOT NULL
        AND wss.weight_kg > 0;

    -- Aktualizuj lub wstaw max_weight PR
    IF v_max_weight > 0 THEN
        INSERT INTO personal_records (
            user_id, exercise_id, metric_type, value,
            achieved_at, achieved_in_session_id, achieved_in_set_number
        )
        SELECT
            p_user_id, p_exercise_id, 'max_weight'::pr_metric_type, v_max_weight,
            wse.updated_at, wse.session_id, wss.set_number
        FROM workout_session_exercises wse
        JOIN workout_session_sets wss ON wss.session_exercise_id = wse.id
        WHERE wse.exercise_id = p_exercise_id
            AND wse.session_id IN (
                SELECT id FROM workout_sessions WHERE user_id = p_user_id
            )
            AND wss.weight_kg = v_max_weight
            AND wss.weight_kg > 0
        ORDER BY wse.updated_at DESC
        LIMIT 1
        ON CONFLICT (user_id, exercise_id, metric_type)
        DO UPDATE SET
            value = EXCLUDED.value,
            achieved_at = EXCLUDED.achieved_at,
            achieved_in_session_id = EXCLUDED.achieved_in_session_id,
            achieved_in_set_number = EXCLUDED.achieved_in_set_number,
            updated_at = now();
    END IF;
END;
$$;
```

### 3.3 `save_workout_session_exercise()` - Zapis ćwiczenia w sesji z walidacją

```sql
CREATE OR REPLACE FUNCTION save_workout_session_exercise(
    p_session_id UUID,
    p_exercise_id UUID,
    p_order INTEGER,
    p_actual_sets INTEGER DEFAULT NULL,
    p_actual_reps INTEGER DEFAULT NULL,
    p_actual_duration_seconds INTEGER DEFAULT NULL,
    p_actual_rest_seconds INTEGER DEFAULT NULL,
    p_is_skipped BOOLEAN DEFAULT false,
    p_sets_data JSONB DEFAULT NULL -- Tablica obiektów: [{"reps": 10, "weight_kg": 20.5}, ...]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_session_exercise_id UUID;
    v_set_item JSONB;
    v_set_number INTEGER := 1;
BEGIN
    -- Sprawdź własność sesji
    SELECT user_id INTO v_user_id
    FROM workout_sessions
    WHERE id = p_session_id;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Session not found';
    END IF;

    IF v_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    -- Pobierz lub utwórz wpis ćwiczenia w sesji
    SELECT id INTO v_session_exercise_id
    FROM workout_session_exercises
    WHERE session_id = p_session_id AND "order" = p_order;

    IF v_session_exercise_id IS NULL THEN
        -- Utwórz nowy wpis (powinien już istnieć z snapshotem, ale na wypadek)
        INSERT INTO workout_session_exercises (
            session_id, exercise_id, "order",
            exercise_title_at_time, exercise_type_at_time, exercise_part_at_time,
            actual_sets, actual_reps, actual_duration_seconds, actual_rest_seconds,
            is_skipped
        )
        SELECT
            p_session_id, p_exercise_id, p_order,
            e.title, e.type, e.part,
            p_actual_sets, p_actual_reps, p_actual_duration_seconds, p_actual_rest_seconds,
            p_is_skipped
        FROM exercises e
        WHERE e.id = p_exercise_id AND e.user_id = v_user_id
        RETURNING id INTO v_session_exercise_id;
    ELSE
        -- Aktualizuj istniejący wpis
        UPDATE workout_session_exercises
        SET
            actual_sets = COALESCE(p_actual_sets, actual_sets),
            actual_reps = COALESCE(p_actual_reps, actual_reps),
            actual_duration_seconds = COALESCE(p_actual_duration_seconds, actual_duration_seconds),
            actual_rest_seconds = COALESCE(p_actual_rest_seconds, actual_rest_seconds),
            is_skipped = p_is_skipped,
            updated_at = now()
        WHERE id = v_session_exercise_id;
    END IF;

    -- Usuń istniejące serie i dodaj nowe (jeśli podano)
    IF p_sets_data IS NOT NULL AND jsonb_array_length(p_sets_data) > 0 THEN
        DELETE FROM workout_session_sets
        WHERE session_exercise_id = v_session_exercise_id;

        -- Dodaj serie
        FOR v_set_item IN SELECT * FROM jsonb_array_elements(p_sets_data)
        LOOP
            INSERT INTO workout_session_sets (
                session_exercise_id, set_number,
                reps, duration_seconds, weight_kg
            )
            VALUES (
                v_session_exercise_id, v_set_number,
                (v_set_item->>'reps')::INTEGER,
                (v_set_item->>'duration_seconds')::INTEGER,
                (v_set_item->>'weight_kg')::NUMERIC
            );
            v_set_number := v_set_number + 1;
        END LOOP;
    END IF;

    -- Przelicz PR dla tego ćwiczenia
    PERFORM recalculate_pr_for_exercise(v_user_id, p_exercise_id);

    -- Aktualizuj last_action_at w sesji
    UPDATE workout_sessions
    SET last_action_at = now(), current_position = p_order
    WHERE id = p_session_id;

    RETURN v_session_exercise_id;
END;
$$;
```

## 4. Row-Level Security (RLS) Policies

### 4.1 `exercises` - RLS

```sql
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY exercises_select_own ON exercises
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY exercises_insert_own ON exercises
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY exercises_update_own ON exercises
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY exercises_delete_own ON exercises
    FOR DELETE
    USING (user_id = auth.uid());
```

### 4.2 `workout_plans` - RLS

```sql
ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY workout_plans_select_own ON workout_plans
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY workout_plans_insert_own ON workout_plans
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY workout_plans_update_own ON workout_plans
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY workout_plans_delete_own ON workout_plans
    FOR DELETE
    USING (user_id = auth.uid());
```

### 4.3 `workout_plan_exercises` - RLS

```sql
ALTER TABLE workout_plan_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY workout_plan_exercises_select_own ON workout_plan_exercises
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workout_plans wp
            WHERE wp.id = workout_plan_exercises.plan_id
            AND wp.user_id = auth.uid()
        )
    );

CREATE POLICY workout_plan_exercises_insert_own ON workout_plan_exercises
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workout_plans wp
            WHERE wp.id = workout_plan_exercises.plan_id
            AND wp.user_id = auth.uid()
        )
    );

CREATE POLICY workout_plan_exercises_update_own ON workout_plan_exercises
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM workout_plans wp
            WHERE wp.id = workout_plan_exercises.plan_id
            AND wp.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workout_plans wp
            WHERE wp.id = workout_plan_exercises.plan_id
            AND wp.user_id = auth.uid()
        )
    );

CREATE POLICY workout_plan_exercises_delete_own ON workout_plan_exercises
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM workout_plans wp
            WHERE wp.id = workout_plan_exercises.plan_id
            AND wp.user_id = auth.uid()
        )
    );
```

### 4.4 `workout_sessions` - RLS

```sql
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY workout_sessions_select_own ON workout_sessions
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY workout_sessions_insert_own ON workout_sessions
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY workout_sessions_update_own ON workout_sessions
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY workout_sessions_delete_own ON workout_sessions
    FOR DELETE
    USING (user_id = auth.uid());
```

### 4.5 `workout_session_exercises` - RLS

```sql
ALTER TABLE workout_session_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY workout_session_exercises_select_own ON workout_session_exercises
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workout_sessions ws
            WHERE ws.id = workout_session_exercises.session_id
            AND ws.user_id = auth.uid()
        )
    );

CREATE POLICY workout_session_exercises_insert_own ON workout_session_exercises
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workout_sessions ws
            WHERE ws.id = workout_session_exercises.session_id
            AND ws.user_id = auth.uid()
        )
    );

CREATE POLICY workout_session_exercises_update_own ON workout_session_exercises
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM workout_sessions ws
            WHERE ws.id = workout_session_exercises.session_id
            AND ws.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workout_sessions ws
            WHERE ws.id = workout_session_exercises.session_id
            AND ws.user_id = auth.uid()
        )
    );

CREATE POLICY workout_session_exercises_delete_own ON workout_session_exercises
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM workout_sessions ws
            WHERE ws.id = workout_session_exercises.session_id
            AND ws.user_id = auth.uid()
        )
    );
```

### 4.6 `workout_session_sets` - RLS

```sql
ALTER TABLE workout_session_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY workout_session_sets_select_own ON workout_session_sets
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM workout_session_exercises wse
            JOIN workout_sessions ws ON ws.id = wse.session_id
            WHERE wse.id = workout_session_sets.session_exercise_id
            AND ws.user_id = auth.uid()
        )
    );

CREATE POLICY workout_session_sets_insert_own ON workout_session_sets
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workout_session_exercises wse
            JOIN workout_sessions ws ON ws.id = wse.session_id
            WHERE wse.id = workout_session_sets.session_exercise_id
            AND ws.user_id = auth.uid()
        )
    );

CREATE POLICY workout_session_sets_update_own ON workout_session_sets
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM workout_session_exercises wse
            JOIN workout_sessions ws ON ws.id = wse.session_id
            WHERE wse.id = workout_session_sets.session_exercise_id
            AND ws.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM workout_session_exercises wse
            JOIN workout_sessions ws ON ws.id = wse.session_id
            WHERE wse.id = workout_session_sets.session_exercise_id
            AND ws.user_id = auth.uid()
        )
    );

CREATE POLICY workout_session_sets_delete_own ON workout_session_sets
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM workout_session_exercises wse
            JOIN workout_sessions ws ON ws.id = wse.session_id
            WHERE wse.id = workout_session_sets.session_exercise_id
            AND ws.user_id = auth.uid()
        )
    );
```

### 4.7 `personal_records` - RLS

```sql
ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY personal_records_select_own ON personal_records
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY personal_records_insert_own ON personal_records
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY personal_records_update_own ON personal_records
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY personal_records_delete_own ON personal_records
    FOR DELETE
    USING (user_id = auth.uid());
```

### 4.8 `ai_usage` - RLS

```sql
ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_usage_select_own ON ai_usage
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY ai_usage_insert_own ON ai_usage
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY ai_usage_update_own ON ai_usage
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
```

### 4.9 `ai_requests` - RLS

```sql
ALTER TABLE ai_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_requests_select_own ON ai_requests
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY ai_requests_insert_own ON ai_requests
    FOR INSERT
    WITH CHECK (user_id = auth.uid());
```

## 5. Relacje między tabelami

### 5.1 Diagram relacji

```
auth.users (by Supabase Auth)
    ├── exercises (1:N) - user_id
    ├── workout_plans (1:N) - user_id
    ├── workout_sessions (1:N) - user_id
    ├── personal_records (1:N) - user_id
    ├── ai_usage (1:N) - user_id
    └── ai_requests (1:N) - user_id

exercises
    ├── workout_plan_exercises (1:N) - exercise_id (ON DELETE RESTRICT)
    ├── workout_session_exercises (1:N) - exercise_id (ON DELETE RESTRICT)
    └── personal_records (1:N) - exercise_id (ON DELETE RESTRICT)

workout_plans
    ├── workout_plan_exercises (1:N) - plan_id (ON DELETE CASCADE)
    ├── workout_sessions (1:N) - workout_plan_id (ON DELETE SET NULL)
    └── ai_requests (1:N) - workout_plan_id (ON DELETE SET NULL)

workout_sessions
    ├── workout_session_exercises (1:N) - session_id (ON DELETE CASCADE)
    ├── personal_records (1:N) - achieved_in_session_id (ON DELETE SET NULL)
    └── ai_requests (1:N) - workout_plan_id (indirect)

workout_session_exercises
    └── workout_session_sets (1:N) - session_exercise_id (ON DELETE CASCADE)
```

### 5.2 Kardynalność relacji

- **users → exercises**: 1:N (jeden użytkownik ma wiele ćwiczeń)
- **users → workout_plans**: 1:N (jeden użytkownik ma wiele planów)
- **users → workout_sessions**: 1:N (jeden użytkownik ma wiele sesji)
- **users → personal_records**: 1:N (jeden użytkownik ma wiele rekordów)
- **exercises → workout_plan_exercises**: 1:N (jedno ćwiczenie może być w wielu planach)
- **workout_plans → workout_plan_exercises**: 1:N (jeden plan ma wiele ćwiczeń)
- **workout_plans → workout_sessions**: 1:N (jeden plan może być użyty w wielu sesjach)
- **workout_sessions → workout_session_exercises**: 1:N (jedna sesja ma wiele ćwiczeń)
- **workout_session_exercises → workout_session_sets**: 1:N (jedno ćwiczenie w sesji ma wiele serii)
- **exercises → personal_records**: 1:N (jedno ćwiczenie może mieć wiele rekordów per typ metryki)

## 6. Indeksy - Podsumowanie

### 6.1 Indeksy dla wydajności zapytań

- **exercises**: `user_id`, `(user_id, title_normalized)`, `(user_id, part)`, `(user_id, type)`
- **workout_plans**: `user_id`, `(user_id, created_at DESC)`
- **workout_plan_exercises**: `plan_id`, `exercise_id`, `(plan_id, section_type, section_order)`
- **workout_sessions**: `user_id`, `(user_id, started_at DESC)`, `(user_id, status)`, `workout_plan_id`, partial unique `(user_id) WHERE status = 'in_progress'`
- **workout_session_exercises**: `session_id`, `exercise_id`, `(session_id, "order")`
- **workout_session_sets**: `session_exercise_id`, `(session_exercise_id, reps, duration_seconds, weight_kg)` dla obliczeń PR
- **personal_records**: `user_id`, `exercise_id`, `(user_id, exercise_id, metric_type)`, `(user_id, achieved_at DESC)`
- **ai_usage**: `user_id`, `(user_id, month_year)`
- **ai_requests**: `user_id`, `(user_id, created_at DESC)`, `is_system_error`, `workout_plan_id`

## 7. Uwagi i wyjaśnienia decyzyjne

### 7.1 Snapshotowanie danych

- **`plan_name_at_time`** w `workout_sessions`: Zapewnia stabilność historii nawet po usunięciu planu
- **`exercise_title_at_time`, `exercise_type_at_time`, `exercise_part_at_time`** w `workout_session_exercises`: Zapewnia stabilność historii nawet po edycji lub usunięciu ćwiczenia
- Snapshoty są kopiowane przy tworzeniu sesji i nie zmieniają się później

### 7.2 Ograniczenie jednej sesji in_progress

- **Partial unique index** na `workout_sessions(user_id) WHERE status = 'in_progress'` zapewnia na poziomie bazy, że użytkownik może mieć tylko jedną aktywną sesję
- Dodatkowo constraint `UNIQUE (user_id) WHERE status = 'in_progress'` jako zabezpieczenie

### 7.3 Normalizacja tytułu ćwiczenia

- **Generated column `title_normalized`**: Automatyczna normalizacja (trim + lowercase + redukcja wielokrotnych spacji)
- **Unique constraint** na `(user_id, title_normalized)` zapewnia unikalność case-insensitive
- Aplikacja powinna walidować przed zapisem, ale baza zapewnia integralność

### 7.4 Materializacja PR

- **Tabela `personal_records`**: Przechowuje obliczone rekordy zamiast liczenia w locie
- **Funkcja `recalculate_pr_for_exercise()`**: Automatyczne przeliczanie po zapisie/edycji serii
- **Typy metryk**: `total_reps` (suma), `max_duration` (maksimum z serii), `max_weight` (maksimum z serii)
- **Metadane rekordu**: `achieved_at`, `achieved_in_session_id`, `achieved_in_set_number` dla śledzenia pochodzenia

### 7.5 Walidacja metryk

- **Ćwiczenia**: CHECK constraint wymaga `reps` LUB `duration` (nie oba)
- **Serie**: CHECK constraint wymaga co najmniej jednej metryki niepustej
- **Spójność**: Aplikacja powinna zapewnić, że metryki w seriach są spójne z typem ćwiczenia

### 7.6 Blokada usuwania ćwiczeń

- **FK RESTRICT**: `exercises` ma `ON DELETE RESTRICT` w relacjach z `workout_plan_exercises`, `workout_session_exercises`, `personal_records`
- Zapobiega usunięciu ćwiczenia, które ma historię (sesje lub PR)
- Aplikacja powinna sprawdzać przed próbą usunięcia i wyświetlać czytelny komunikat

### 7.7 Limit AI (5/miesiąc)

- **Tabela `ai_usage`**: Przechowuje licznik per użytkownik per miesiąc
- **Funkcja `check_and_increment_ai_usage()`**: Atomowe sprawdzenie i zwiększenie limitu
- **Reset automatyczny**: Nowy miesiąc tworzy nowy wiersz z `usage_count = 0`
- **System errors**: `is_system_error` w `ai_requests` pozwala na rozróżnienie błędów systemowych (nie liczą się do limitu)

### 7.8 Kolejność ćwiczeń w planie

- **`section_type` + `section_order`**: Umożliwia organizację ćwiczeń w sekcje (Warm-up, Main, Cool-down)
- **Unique constraint**: `(plan_id, section_type, section_order)` zapewnia unikalność kolejności w sekcji
- **Kolejność w sesji**: `order` w `workout_session_exercises` determinuje kolejność wykonywania

### 7.9 Jednostki i typy danych

- **Czas**: `duration_seconds`, `rest_seconds` jako `INTEGER` (sekundy)
- **Waga**: `weight_kg` jako `NUMERIC(6, 2)` (kilogramy z dokładnością do 0.01)
- **Powtórzenia**: `reps` jako `INTEGER`
- **CHECK constraints**: Wszystkie wartości >= 0 (z wyjątkiem wymaganych > 0)

### 7.10 Funkcje RPC (SECURITY DEFINER)

- **`save_workout_session_exercise()`**: Atomowy zapis ćwiczenia w sesji z walidacją i przeliczeniem PR
- **`recalculate_pr_for_exercise()`**: Przeliczenie wszystkich typów PR dla ćwiczenia
- **`check_and_increment_ai_usage()`**: Atomowe sprawdzenie i zwiększenie limitu AI
- Wszystkie funkcje używają `SECURITY DEFINER` dla atomowości i kontroli dostępu

### 7.11 Row-Level Security (RLS)

- **Wszystkie tabele domenowe** mają włączone RLS
- **Policies**: Każda tabela ma osobne policy dla SELECT, INSERT, UPDATE, DELETE
- **Filtrowanie**: Wszystkie policies używają `user_id = auth.uid()` lub sprawdzają własność przez relacje
- **Bezpieczeństwo**: RLS działa niezależnie od UI, zapewniając izolację danych na poziomie bazy

### 7.12 Architektura gotowa na skalowanie

- **Indeksy strategiczne**: Zoptymalizowane pod najczęstsze zapytania (listy per użytkownik, sortowanie po dacie)
- **Materializacja PR**: Unika kosztownych obliczeń w locie
- **Paginacja**: Architektura nie blokuje dodania paginacji w przyszłości
- **Partycjonowanie**: Nie wymagane dla ~5 użytkowników, ale schemat nie uniemożliwia partycjonowania w przyszłości
