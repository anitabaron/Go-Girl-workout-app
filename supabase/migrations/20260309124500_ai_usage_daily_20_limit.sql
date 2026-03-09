-- ============================================================================
-- Migration: AI usage limit to 20/day (aligned with app logic)
-- ============================================================================

ALTER TABLE ai_usage
  DROP CONSTRAINT IF EXISTS ai_usage_usage_count_check;

ALTER TABLE ai_usage
  ADD CONSTRAINT ai_usage_usage_count_check
  CHECK (usage_count >= 0 AND usage_count <= 20);
