/*
# Create projects and conversations tables

1. New Tables
- `projects`: stores user-generated website projects with their file contents
  - `id` (uuid, primary key)
  - `user_id` (uuid, not null, defaults to authenticated user, references auth.users)
  - `name` (text, not null)
  - `description` (text, default empty)
  - `files` (jsonb, default empty object — stores the full project file tree)
  - `framework` (text, default 'react')
  - `created_at` (timestamptz, default now)
  - `updated_at` (timestamptz, default now)
- `conversations`: stores chat conversations between user and AI agent per project
  - `id` (uuid, primary key)
  - `user_id` (uuid, not null, defaults to authenticated user, references auth.users)
  - `project_id` (uuid, not null, references projects, cascade delete)
  - `messages` (jsonb, default empty array — array of {role, content, timestamp})
  - `created_at` (timestamptz, default now)
  - `updated_at` (timestamptz, default now)

2. Indexes
- `projects_user_id_idx` on projects(user_id) for fast per-user listing
- `conversations_project_id_idx` on conversations(project_id) for fast per-project listing

3. Security
- Enable RLS on both tables.
- Owner-scoped CRUD: each authenticated user can only access rows they own.
- All 4 policies (SELECT, INSERT, UPDATE, DELETE) per table, scoped to auth.uid() = user_id.
- user_id columns default to auth.uid() so client inserts that omit user_id succeed.
*/
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  files jsonb NOT NULL DEFAULT '{}'::jsonb,
  framework text NOT NULL DEFAULT 'react',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS projects_user_id_idx ON projects(user_id);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_projects" ON projects;
CREATE POLICY "select_own_projects"
ON projects FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_projects" ON projects;
CREATE POLICY "insert_own_projects"
ON projects FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_projects" ON projects;
CREATE POLICY "update_own_projects"
ON projects FOR UPDATE
TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_projects" ON projects;
CREATE POLICY "delete_own_projects"
ON projects FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS conversations_project_id_idx ON conversations(project_id);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_conversations" ON conversations;
CREATE POLICY "select_own_conversations"
ON conversations FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_conversations" ON conversations;
CREATE POLICY "insert_own_conversations"
ON conversations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_conversations" ON conversations;
CREATE POLICY "update_own_conversations"
ON conversations FOR UPDATE
TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_conversations" ON conversations;
CREATE POLICY "delete_own_conversations"
ON conversations FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- A project should have one conversation row per owner/project pair so upsert works.
CREATE UNIQUE INDEX IF NOT EXISTS conversations_user_project_uidx
ON conversations(user_id, project_id);

-- Keep updated_at current when rows are changed directly from Supabase.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS projects_set_updated_at ON projects;
CREATE TRIGGER projects_set_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS conversations_set_updated_at ON conversations;
CREATE TRIGGER conversations_set_updated_at
BEFORE UPDATE ON conversations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
