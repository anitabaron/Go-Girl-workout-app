-- ============================================================================
-- Migration: Enable RLS for test-num table
-- ============================================================================
-- Purpose: Enable Row Level Security and add public read policy for test-num table
--          This allows anonymous users to read test data for connection testing
--
-- Note: This is a test table. For production tables, use more restrictive policies.
-- ============================================================================

-- Enable RLS on test-num table (if not already enabled)
ALTER TABLE IF EXISTS "test-num" ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists (to allow re-running migration)
DROP POLICY IF EXISTS "Allow public read on test-num" ON "test-num";

-- Create policy to allow public read access
CREATE POLICY "Allow public read on test-num"
ON "test-num"
FOR SELECT
TO anon, authenticated
USING (true);

-- Optional: If you want to allow inserts for testing (uncomment if needed)
-- DROP POLICY IF EXISTS "Allow public insert on test-num" ON "test-num";
-- CREATE POLICY "Allow public insert on test-num"
-- ON "test-num"
-- FOR INSERT
-- TO anon, authenticated
-- WITH CHECK (true);
