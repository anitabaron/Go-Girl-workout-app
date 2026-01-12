-- ============================================================================
-- Migration: Create test-num table for database connection testing
-- ============================================================================
-- Purpose: Create a simple test table to verify Supabase connection works
--          and can be updated in real-time
--
-- Actions:
--   1. Create test-num table with id, created_at, num, letter columns
--   2. Insert sample test data
--   3. Disable RLS for development
-- ============================================================================

-- ============================================================================
-- 1. CREATE TABLE
-- ============================================================================

create table if not exists "test-num" (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  num integer not null,
  letter text not null
);

-- ============================================================================
-- 2. INSERT SAMPLE DATA
-- ============================================================================

insert into "test-num" (num, letter) values
  (1, 'A'),
  (2, 'B'),
  (3, 'C'),
  (4, 'D'),
  (5, 'E');

-- ============================================================================
-- 3. DISABLE RLS FOR DEVELOPMENT
-- ============================================================================

alter table "test-num" disable row level security;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
