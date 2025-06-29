/*
  # Fix storage policies for voice recordings bucket

  1. Policy Updates
    - Update storage policies to handle voice_recordings bucket correctly
    - Ensure proper folder-based access control using supabase_uuid
    - Fix policy conditions for voice recordings

  2. Security
    - Users can only access voice recordings in their own UUID-named folders
    - Proper authentication using requesting_user_id() function
*/

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view their own voice recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own voice recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own voice recordings" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own voice recordings" ON storage.objects;

-- Policy for SELECT operations (viewing/downloading voice recordings)
CREATE POLICY "Users can view their own voice recordings"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'voice_recordings' AND 
    (storage.foldername(name))[1] = (
      SELECT supabase_uuid::text
      FROM public.user_profiles
      WHERE user_id = requesting_user_id()
    )
  );

-- Policy for INSERT operations (uploading new voice recordings)
CREATE POLICY "Users can upload their own voice recordings"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'voice_recordings' AND 
    (storage.foldername(name))[1] = (
      SELECT supabase_uuid::text
      FROM public.user_profiles
      WHERE user_id = requesting_user_id()
    )
  );

-- Policy for UPDATE operations (updating existing voice recordings)
CREATE POLICY "Users can update their own voice recordings"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'voice_recordings' AND 
    (storage.foldername(name))[1] = (
      SELECT supabase_uuid::text
      FROM public.user_profiles
      WHERE user_id = requesting_user_id()
    )
  )
  WITH CHECK (
    bucket_id = 'voice_recordings' AND 
    (storage.foldername(name))[1] = (
      SELECT supabase_uuid::text
      FROM public.user_profiles
      WHERE user_id = requesting_user_id()
    )
  );

-- Policy for DELETE operations (deleting voice recordings)
CREATE POLICY "Users can delete their own voice recordings"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'voice_recordings' AND 
    (storage.foldername(name))[1] = (
      SELECT supabase_uuid::text
      FROM public.user_profiles
      WHERE user_id = requesting_user_id()
    )
  );