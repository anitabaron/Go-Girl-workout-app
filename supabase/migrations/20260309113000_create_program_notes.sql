-- ============================================================================
-- Migration: Program Notes journal (program/session feedback)
-- ============================================================================

CREATE TABLE IF NOT EXISTS program_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  training_program_id uuid NOT NULL REFERENCES training_programs(id) ON DELETE CASCADE,
  program_session_id uuid REFERENCES program_sessions(id) ON DELETE SET NULL,
  note_text text NOT NULL CHECK (length(trim(note_text)) > 0),
  fatigue_level integer CHECK (fatigue_level BETWEEN 1 AND 10),
  vitality_level integer CHECK (vitality_level BETWEEN 1 AND 10),
  source text NOT NULL DEFAULT 'user' CHECK (source IN ('user', 'ai_action', 'ai_summary')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_program_notes_user_program_created_at
  ON program_notes(user_id, training_program_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_program_notes_program_session_id
  ON program_notes(program_session_id);

CREATE TRIGGER program_notes_updated_at
  BEFORE UPDATE ON program_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE program_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS program_notes_select_authenticated ON program_notes;
CREATE POLICY program_notes_select_authenticated ON program_notes
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS program_notes_insert_authenticated ON program_notes;
CREATE POLICY program_notes_insert_authenticated ON program_notes
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM training_programs tp
      WHERE tp.id = program_notes.training_program_id
        AND tp.user_id = auth.uid()
    )
    AND (
      program_session_id IS NULL
      OR EXISTS (
        SELECT 1 FROM program_sessions ps
        WHERE ps.id = program_notes.program_session_id
          AND ps.user_id = auth.uid()
          AND ps.training_program_id = program_notes.training_program_id
      )
    )
  );

DROP POLICY IF EXISTS program_notes_update_authenticated ON program_notes;
CREATE POLICY program_notes_update_authenticated ON program_notes
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM training_programs tp
      WHERE tp.id = program_notes.training_program_id
        AND tp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS program_notes_delete_authenticated ON program_notes;
CREATE POLICY program_notes_delete_authenticated ON program_notes
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());
