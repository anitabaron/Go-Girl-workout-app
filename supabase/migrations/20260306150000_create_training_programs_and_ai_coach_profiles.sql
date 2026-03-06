-- ============================================================================
-- Migration: Training Programs + Program Sessions + AI Coach Profiles
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'training_program_status'
  ) THEN
    CREATE TYPE training_program_status AS ENUM ('draft', 'active', 'archived');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'training_program_source'
  ) THEN
    CREATE TYPE training_program_source AS ENUM ('ai', 'manual');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'program_session_status'
  ) THEN
    CREATE TYPE program_session_status AS ENUM ('planned', 'completed');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'coach_profile_tone'
  ) THEN
    CREATE TYPE coach_profile_tone AS ENUM ('calm', 'motivating', 'direct');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'coach_profile_strictness'
  ) THEN
    CREATE TYPE coach_profile_strictness AS ENUM ('low', 'medium', 'high');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'coach_profile_verbosity'
  ) THEN
    CREATE TYPE coach_profile_verbosity AS ENUM ('short', 'balanced', 'detailed');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS training_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  goal_text text,
  duration_months integer NOT NULL CHECK (duration_months IN (1, 2, 3)),
  weeks_count integer NOT NULL CHECK (weeks_count IN (4, 8, 12)),
  sessions_per_week integer NOT NULL CHECK (sessions_per_week >= 1 AND sessions_per_week <= 7),
  status training_program_status NOT NULL DEFAULT 'draft',
  source training_program_source NOT NULL DEFAULT 'ai',
  coach_profile_snapshot jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_training_programs_user_id
  ON training_programs(user_id);

CREATE INDEX IF NOT EXISTS idx_training_programs_user_id_status
  ON training_programs(user_id, status);

CREATE TRIGGER training_programs_updated_at
  BEFORE UPDATE ON training_programs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS program_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  training_program_id uuid NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  workout_plan_id uuid NOT NULL REFERENCES workout_plans(id) ON DELETE RESTRICT,
  scheduled_date date NOT NULL,
  week_index integer NOT NULL CHECK (week_index > 0),
  session_index integer NOT NULL CHECK (session_index > 0),
  status program_session_status NOT NULL DEFAULT 'planned',
  progression_overrides jsonb,
  linked_workout_session_id uuid REFERENCES workout_sessions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT program_sessions_unique_program_session_index
    UNIQUE (training_program_id, session_index)
);

CREATE INDEX IF NOT EXISTS idx_program_sessions_user_id_scheduled_date
  ON program_sessions(user_id, scheduled_date);

CREATE INDEX IF NOT EXISTS idx_program_sessions_user_id_status
  ON program_sessions(user_id, status);

CREATE INDEX IF NOT EXISTS idx_program_sessions_linked_workout_session_id
  ON program_sessions(linked_workout_session_id);

CREATE TRIGGER program_sessions_updated_at
  BEFORE UPDATE ON program_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS ai_coach_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  persona_name text NOT NULL DEFAULT 'Wspierający',
  tone coach_profile_tone NOT NULL DEFAULT 'calm',
  strictness coach_profile_strictness NOT NULL DEFAULT 'medium',
  verbosity coach_profile_verbosity NOT NULL DEFAULT 'balanced',
  focus text,
  risk_tolerance text,
  contraindications text,
  preferred_methodology text,
  rules jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_coach_profiles_user_unique UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_ai_coach_profiles_user_id
  ON ai_coach_profiles(user_id);

CREATE TRIGGER ai_coach_profiles_updated_at
  BEFORE UPDATE ON ai_coach_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE training_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_coach_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS training_programs_select_authenticated ON training_programs;
CREATE POLICY training_programs_select_authenticated ON training_programs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS training_programs_insert_authenticated ON training_programs;
CREATE POLICY training_programs_insert_authenticated ON training_programs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS training_programs_update_authenticated ON training_programs;
CREATE POLICY training_programs_update_authenticated ON training_programs
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS training_programs_delete_authenticated ON training_programs;
CREATE POLICY training_programs_delete_authenticated ON training_programs
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS program_sessions_select_authenticated ON program_sessions;
CREATE POLICY program_sessions_select_authenticated ON program_sessions
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS program_sessions_insert_authenticated ON program_sessions;
CREATE POLICY program_sessions_insert_authenticated ON program_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM training_programs tp
      WHERE tp.id = program_sessions.training_program_id
        AND tp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS program_sessions_update_authenticated ON program_sessions;
CREATE POLICY program_sessions_update_authenticated ON program_sessions
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM training_programs tp
      WHERE tp.id = program_sessions.training_program_id
        AND tp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS program_sessions_delete_authenticated ON program_sessions;
CREATE POLICY program_sessions_delete_authenticated ON program_sessions
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS ai_coach_profiles_select_authenticated ON ai_coach_profiles;
CREATE POLICY ai_coach_profiles_select_authenticated ON ai_coach_profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS ai_coach_profiles_insert_authenticated ON ai_coach_profiles;
CREATE POLICY ai_coach_profiles_insert_authenticated ON ai_coach_profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS ai_coach_profiles_update_authenticated ON ai_coach_profiles;
CREATE POLICY ai_coach_profiles_update_authenticated ON ai_coach_profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS ai_coach_profiles_delete_authenticated ON ai_coach_profiles;
CREATE POLICY ai_coach_profiles_delete_authenticated ON ai_coach_profiles
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
