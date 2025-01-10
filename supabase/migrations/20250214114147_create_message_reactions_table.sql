-- Create message_reactions table
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  message_id bigint REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
  emoji text NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Policy to allow inserting reactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow inserting reactions' AND tablename = 'message_reactions'
  ) THEN
    CREATE POLICY "Allow inserting reactions" ON public.message_reactions
    AS PERMISSIVE FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.messages m
        WHERE m.id = message_id AND m.channel_id IN (
          SELECT cm.channel_id FROM public.channel_members cm WHERE cm.user_id = auth.uid()
        )
      )
    );
  END IF;
END$$;

-- Policy to allow deleting own reactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Allow deleting own reactions' AND tablename = 'message_reactions'
  ) THEN
    CREATE POLICY "Allow deleting own reactions" ON public.message_reactions
    AS PERMISSIVE FOR DELETE
    TO authenticated
    USING (user_id = auth.uid());
  END IF;
END$$; 