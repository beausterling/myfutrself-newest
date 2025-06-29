/*
  # Setup Storage Policies for future-self-images bucket

  1. Storage Policies
    - Create RLS policies for the future-self-images bucket
    - Allow authenticated users to manage their own images based on supabase_uuid
    - Use proper storage.objects table structure with name column

  2. Security
    - Users can only access files in their own folder (supabase_uuid)
    - Proper authentication checks using requesting_user_id()
    - Comprehensive CRUD operations (SELECT, INSERT, UPDATE, DELETE)
*/

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to manage their images" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own images" ON storage.objects;

-- Policy for SELECT operations (viewing/downloading images)
CREATE POLICY "Users can view their own images"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'future-self-images' AND (
      (storage.foldername(name))[1] = (
        SELECT supabase_uuid::text
        FROM public.user_profiles
        WHERE user_id = requesting_user_id()
      )
    )
  );

-- Policy for INSERT operations (uploading new images)
CREATE POLICY "Users can upload their own images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'future-self-images' AND (
      (storage.foldername(name))[1] = (
        SELECT supabase_uuid::text
        FROM public.user_profiles
        WHERE user_id = requesting_user_id()
      )
    )
  );

-- Policy for UPDATE operations (updating existing images)
CREATE POLICY "Users can update their own images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'future-self-images' AND (
      (storage.foldername(name))[1] = (
        SELECT supabase_uuid::text
        FROM public.user_profiles
        WHERE user_id = requesting_user_id()
      )
    )
  )
  WITH CHECK (
    bucket_id = 'future-self-images' AND (
      (storage.foldername(name))[1] = (
        SELECT supabase_uuid::text
        FROM public.user_profiles
        WHERE user_id = requesting_user_id()
      )
    )
  );

-- Policy for DELETE operations (deleting images)
CREATE POLICY "Users can delete their own images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'future-self-images' AND (
      (storage.foldername(name))[1] = (
        SELECT supabase_uuid::text
        FROM public.user_profiles
        WHERE user_id = requesting_user_id()
      )
    )
  );

-- Create the future-self-images bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('future-self-images', 'future-self-images', true)
ON CONFLICT (id) DO NOTHING;