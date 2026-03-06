-- ============================================================================
-- Migration: Create AI Chat History Tables
-- ============================================================================
-- Purpose: Persist AI chat conversations/messages per user.
-- ============================================================================

create table ai_chat_conversations (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references auth.users(id) on delete cascade,
    title text not null default 'Nowa konwersacja',
    last_message_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_ai_chat_conversations_user_id
    on ai_chat_conversations(user_id);

create index idx_ai_chat_conversations_user_last_message_at
    on ai_chat_conversations(user_id, last_message_at desc);

create trigger ai_chat_conversations_updated_at
    before update on ai_chat_conversations
    for each row
    execute function update_updated_at_column();

create table ai_chat_messages (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references ai_chat_conversations(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    role text not null check (role in ('user', 'assistant')),
    content text not null,
    created_at timestamptz not null default now()
);

create index idx_ai_chat_messages_conversation_id_created_at
    on ai_chat_messages(conversation_id, created_at asc);

create index idx_ai_chat_messages_user_id_created_at
    on ai_chat_messages(user_id, created_at desc);

alter table ai_chat_conversations enable row level security;
alter table ai_chat_messages enable row level security;

create policy ai_chat_conversations_select_authenticated on ai_chat_conversations
    for select
    to authenticated
    using (user_id = auth.uid());

create policy ai_chat_conversations_insert_authenticated on ai_chat_conversations
    for insert
    to authenticated
    with check (user_id = auth.uid());

create policy ai_chat_conversations_update_authenticated on ai_chat_conversations
    for update
    to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());

create policy ai_chat_conversations_delete_authenticated on ai_chat_conversations
    for delete
    to authenticated
    using (user_id = auth.uid());

create policy ai_chat_messages_select_authenticated on ai_chat_messages
    for select
    to authenticated
    using (user_id = auth.uid());

create policy ai_chat_messages_insert_authenticated on ai_chat_messages
    for insert
    to authenticated
    with check (user_id = auth.uid());

create policy ai_chat_messages_delete_authenticated on ai_chat_messages
    for delete
    to authenticated
    using (user_id = auth.uid());
