-- Allow users to select channels they are a member of or public channels
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow access to channels' AND tablename = 'channels'
  ) THEN
    CREATE POLICY "Allow access to channels" ON public.channels
    AS PERMISSIVE FOR SELECT
    TO authenticated
    USING (
      -- Access if the user is a member
      EXISTS (
        SELECT 1 FROM public.channel_members cm
        WHERE cm.channel_id = id AND cm.user_id = auth.uid()
      ) OR
      -- Access if the channel is not a direct message
      is_direct = FALSE
    );
  END IF;
END$$;

-- Allow users to insert into channels
CREATE POLICY "Allow insert into channels" ON public.channels
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (
  -- Users can create channels if they are not direct messages or they are direct messages and created_by is the current user
  is_direct = FALSE OR (is_direct = TRUE AND created_by = auth.uid())
);

-- Allow users to select messages in channels they have access to
CREATE POLICY "Allow access to messages" ON public.messages
AS PERMISSIVE FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.channel_members cm
    WHERE cm.channel_id = channel_id AND cm.user_id = auth.uid()
  ) OR
  -- Access if the channel is not a direct message
  (SELECT is_direct FROM public.channels WHERE id = channel_id) = FALSE
);

-- Ensure only members can insert messages into channels they have access to
CREATE POLICY "Allow inserting messages" ON public.messages
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.channel_members cm
    WHERE cm.channel_id = channel_id AND cm.user_id = auth.uid()
  ) OR
  -- Access if the channel is not a direct message
  (SELECT is_direct FROM public.channels WHERE id = channel_id) = FALSE
); 