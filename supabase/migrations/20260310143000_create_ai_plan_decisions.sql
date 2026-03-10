-- ============================================================================
-- Migration: AI plan decisions audit log
-- ============================================================================
-- Purpose: Persist planner proposals, validation, repairs and final output.
-- ============================================================================

create table if not exists ai_plan_decisions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  training_program_id uuid references training_programs(id) on delete set null,
  request_type ai_request_type not null default 'generate',
  planner_source text not null default 'unknown',
  input_snapshot jsonb not null,
  planner_output jsonb not null,
  validation_result jsonb not null,
  repair_log jsonb not null default '[]'::jsonb,
  final_output jsonb not null,
  guardrail_events jsonb not null default '[]'::jsonb,
  realism_score integer not null check (realism_score between 0 and 100),
  accepted boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ai_plan_decisions_user_created_at
  on ai_plan_decisions(user_id, created_at desc);

create index if not exists idx_ai_plan_decisions_training_program_id
  on ai_plan_decisions(training_program_id);

create trigger ai_plan_decisions_updated_at
  before update on ai_plan_decisions
  for each row
  execute function update_updated_at_column();

alter table ai_plan_decisions enable row level security;

drop policy if exists ai_plan_decisions_select_authenticated on ai_plan_decisions;
create policy ai_plan_decisions_select_authenticated on ai_plan_decisions
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists ai_plan_decisions_insert_authenticated on ai_plan_decisions;
create policy ai_plan_decisions_insert_authenticated on ai_plan_decisions
  for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists ai_plan_decisions_update_authenticated on ai_plan_decisions;
create policy ai_plan_decisions_update_authenticated on ai_plan_decisions
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists ai_plan_decisions_delete_authenticated on ai_plan_decisions;
create policy ai_plan_decisions_delete_authenticated on ai_plan_decisions
  for delete to authenticated
  using (user_id = auth.uid());
