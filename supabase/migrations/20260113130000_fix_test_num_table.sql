-- ============================================================================
-- Migration: Fix test-num table structure
-- ============================================================================
-- Purpose: Drop and recreate test-num table with correct structure
--          to fix schema mismatch between local and remote databases
--
-- Actions:
--   1. Drop existing test-num table (if exists)
--   2. Recreate table with correct structure
--   3. Insert sample test data
--   4. Disable RLS for development
-- ============================================================================

-- ============================================================================
-- 1. DROP EXISTING TABLE (if exists with wrong structure)
-- ============================================================================

drop table if exists "test-num" cascade;

-- ============================================================================
-- 2. CREATE TABLE WITH CORRECT STRUCTURE
-- ============================================================================

create table if not exists "test-num" (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  num integer not null,
  letter text not null
);

-- ============================================================================
-- 3. CLEAR EXISTING DATA AND INSERT SAMPLE DATA
-- ============================================================================

-- Delete existing data if any
delete from "test-num";

-- Insert sample data (using ON CONFLICT to handle duplicates)
insert into "test-num" (num, letter) values
  (1, 'A'),
  (2, 'B'),
  (3, 'C'),
  (4, 'D'),
  (5, 'E')
on conflict do nothing;

-- ============================================================================
-- 4. DISABLE RLS FOR DEVELOPMENT
-- ============================================================================

alter table "test-num" disable row level security;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
