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

-- Only insert if table is empty (to avoid conflicts with existing data)
do $$
begin
  if not exists (select 1 from "test-num" limit 1) then
    insert into "test-num" (num, letter) values
      (1, 'A'),
      (2, 'B'),
      (3, 'C'),
      (4, 'D'),
      (5, 'E');
  end if;
end $$;

-- ============================================================================
-- 3. DISABLE RLS FOR DEVELOPMENT
-- ============================================================================

-- Only disable RLS if table exists
do $$
begin
    if exists (select 1 from information_schema.tables where table_name = 'test-num') then
        alter table "test-num" disable row level security;
    end if;
end $$;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
