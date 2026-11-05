-- Isolated names preserve unrelated Nexus tables and policies.
create table public.buildora_projects (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 name text not null check (char_length(name) between 1 and 200),
 description text not null default '',
 files jsonb not null default '{}'::jsonb check (jsonb_typeof(files)='object'),
 framework text not null default 'react',
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now()
);
create index buildora_projects_owner_idx on public.buildora_projects(user_id);
alter table public.buildora_projects enable row level security;
create policy buildora_project_owner on public.buildora_projects for all to authenticated
 using ((select auth.uid())=user_id) with check ((select auth.uid())=user_id);
create table public.buildora_conversations (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 project_id uuid not null references public.buildora_projects(id) on delete cascade,
 messages jsonb not null default '[]'::jsonb check (jsonb_typeof(messages)='array'),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(user_id,project_id)
);
create index buildora_conversations_project_idx on public.buildora_conversations(project_id);
alter table public.buildora_conversations enable row level security;
create policy buildora_conversation_owner on public.buildora_conversations for all to authenticated
 using ((select auth.uid())=user_id)
 with check ((select auth.uid())=user_id and exists(select 1 from public.buildora_projects p where p.id=project_id and p.user_id=(select auth.uid())));
revoke all on public.buildora_projects,public.buildora_conversations from anon;
grant select,insert,update,delete on public.buildora_projects,public.buildora_conversations to authenticated;
