-- Add file_url column to messages table
ALTER TABLE public.messages
ADD COLUMN file_url text;

-- Update policy to allow inserting file_url
ALTER POLICY "Allow individual insert access" ON public.messages
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Update policy to allow selecting file_url
ALTER POLICY "Allow logged-in read access" ON public.messages
AS PERMISSIVE FOR SELECT
TO authenticated
USING (auth.role() = 'authenticated');