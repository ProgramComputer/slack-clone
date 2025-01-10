-- Add is_direct column to channels table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'channels' AND column_name = 'is_direct'
  ) THEN
    ALTER TABLE public.channels
    ADD COLUMN is_direct BOOLEAN DEFAULT FALSE; 
  END IF;
END$$;

-- Create channel_members table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.channel_members (
  channel_id BIGINT REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  PRIMARY KEY (channel_id, user_id)
); 