-- Create storage bucket for profile pictures if it doesn't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('profilepics', 'profilepics', true)
  ON CONFLICT DO NOTHING;
END $$;

-- Enable RLS on the storage.objects table
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policies for the storage.objects table
-- Allow users to read any profile picture
CREATE POLICY "Give users read access to profilepics"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'profilepics'
  AND auth.role() = 'authenticated'
);

-- Allow users to upload/update their own profile picture
CREATE POLICY "Allow users to upload their own profile picture"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profilepics'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND auth.role() = 'authenticated'
);

-- Allow users to update their own profile picture
CREATE POLICY "Allow users to update their own profile picture"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profilepics'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND auth.role() = 'authenticated'
);

-- Allow users to delete their own profile picture
CREATE POLICY "Allow users to delete their own profile picture"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profilepics'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND auth.role() = 'authenticated'
);

-- Create function to delete user's profile pictures
CREATE OR REPLACE FUNCTION delete_user_profile_pictures()
RETURNS TRIGGER AS $$
DECLARE
  files_to_delete text[];
BEGIN
  -- Get all files in the user's folder
  SELECT array_agg(name) INTO files_to_delete
  FROM storage.objects
  WHERE bucket_id = 'profilepics' 
  AND (storage.foldername(name))[1] = OLD.id::text;

  -- Delete the files if any exist
  IF array_length(files_to_delete, 1) > 0 THEN
    DELETE FROM storage.objects
    WHERE bucket_id = 'profilepics'
    AND name = ANY(files_to_delete);
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically delete profile pictures when user is deleted
DROP TRIGGER IF EXISTS delete_profile_pictures_trigger ON auth.users;
CREATE TRIGGER delete_profile_pictures_trigger
  BEFORE DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION delete_user_profile_pictures(); 