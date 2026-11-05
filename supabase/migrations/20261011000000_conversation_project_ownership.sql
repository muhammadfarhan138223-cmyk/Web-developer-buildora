-- Prevent a conversation from referencing a different owner's project.
DROP POLICY IF EXISTS "insert_own_conversations" ON public.conversations;
CREATE POLICY "insert_own_conversations" ON public.conversations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND EXISTS (
  SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()
));
DROP POLICY IF EXISTS "update_own_conversations" ON public.conversations;
CREATE POLICY "update_own_conversations" ON public.conversations FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id AND EXISTS (
  SELECT 1 FROM public.projects p WHERE p.id = project_id AND p.user_id = auth.uid()
));
