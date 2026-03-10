-- ============================================================================
-- Migration: User capability profiles
-- ============================================================================
-- Purpose: Store per-user capability caps used by AI planning.
-- ============================================================================

create table if not exists user_capability_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  movement_key text not null,
  exercise_id uuid references exercises(id) on delete set null,
  current_level text,
  comfort_max_reps integer check (comfort_max_reps is null or comfort_max_reps > 0),
  comfort_max_duration_seconds integer check (
    comfort_max_duration_seconds is null or comfort_max_duration_seconds > 0
  ),
  comfort_max_load_kg numeric check (comfort_max_load_kg is null or comfort_max_load_kg >= 0),
  best_recent_reps integer check (best_recent_reps is null or best_recent_reps > 0),
  best_recent_duration_seconds integer check (
    best_recent_duration_seconds is null or best_recent_duration_seconds > 0
  ),
  best_recent_load_kg numeric check (best_recent_load_kg is null or best_recent_load_kg >= 0),
  weekly_progression_cap_percent integer not null default 15 check (
    weekly_progression_cap_percent between 0 and 30
  ),
  per_session_progression_cap_reps integer check (
    per_session_progression_cap_reps is null or per_session_progression_cap_reps > 0
  ),
  per_session_progression_cap_duration_seconds integer check (
    per_session_progression_cap_duration_seconds is null or per_session_progression_cap_duration_seconds > 0
  ),
  confidence_score integer not null default 60 check (confidence_score between 0 and 100),
  pain_flag boolean not null default false,
  pain_notes text,
  updated_from text not null default 'manual' check (
    updated_from in ('manual', 'ai_feedback', 'session_result', 'import')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_capability_profiles_unique_scope unique (user_id, movement_key, exercise_id)
);

create index if not exists idx_user_capability_profiles_user_movement
  on user_capability_profiles(user_id, movement_key);

create trigger user_capability_profiles_updated_at
  before update on user_capability_profiles
  for each row
  execute function update_updated_at_column();

alter table user_capability_profiles enable row level security;

drop policy if exists user_capability_profiles_select_authenticated on user_capability_profiles;
create policy user_capability_profiles_select_authenticated on user_capability_profiles
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists user_capability_profiles_insert_authenticated on user_capability_profiles;
create policy user_capability_profiles_insert_authenticated on user_capability_profiles
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists user_capability_profiles_update_authenticated on user_capability_profiles;
create policy user_capability_profiles_update_authenticated on user_capability_profiles
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists user_capability_profiles_delete_authenticated on user_capability_profiles;
create policy user_capability_profiles_delete_authenticated on user_capability_profiles
  for delete to authenticated
  using (user_id = auth.uid());
