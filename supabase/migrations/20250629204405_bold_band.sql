/*
  # Create voice_recordings storage bucket

  1. Storage Setup
    - Create voice_recordings bucket for storing user voice recordings
    - Set up RLS policies for secure access to voice recordings
    - Configure bucket settings for audio files

  2. Security
    - Users can only access voice recordings in folders named with their supabase_uuid
    - All CRUD operations are properly secured
    - Uses requesting_user_id() function for authentication
*/

-- Create the voice_recordings bucket if it doesn't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'voice_recordings', 
    'voice_recordings', 
    true,
    10485760, -- 10MB limit for voice recordings
    ARRAY['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/m4a', 'audio/ogg', 'audio/webm']
  )
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Drop existing policies if they exist (to avoid conflicts)
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