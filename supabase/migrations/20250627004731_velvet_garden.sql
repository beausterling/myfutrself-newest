/*
  # Setup Storage Policies for Future Self Images

  1. Storage Setup
    - Create future-self-images bucket if it doesn't exist
    - Set up RLS policies for user image access
    
  2. Security
    - Users can only access images in folders named with their supabase_uuid
    - All CRUD operations are properly secured
    - Uses requesting_user_id() function for authentication
*/

-- Create the future-self-images bucket if it doesn't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'future-self-images', 
    'future-self-images', 
    true,
    52428800, -- 50MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  )
  ON CONFLICT (id) DO NOTHING;
END $$;

-- Drop existing policies if they exist (to avoid conflicts)
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
    bucket_id = 'future-self-images' AND 
    (storage.foldername(name))[1] = (
      SELECT supabase_uuid::text
      FROM public.user_profiles
      WHERE user_id = requesting_user_id()
    )
  );

-- Policy for INSERT operations (uploading new images)
CREATE POLICY "Users can upload their own images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'future-self-images' AND 
    (storage.foldername(name))[1] = (
      SELECT supabase_uuid::text
      FROM public.user_profiles
      WHERE user_id = requesting_user_id()
    )
  );

-- Policy for UPDATE operations (updating existing images)
CREATE POLICY "Users can update their own images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'future-self-images' AND 
    (storage.foldername(name))[1] = (
      SELECT supabase_uuid::text
      FROM public.user_profiles
      WHERE user_id = requesting_user_id()
    )
  )
  WITH CHECK (
    bucket_id = 'future-self-images' AND 
    (storage.foldername(name))[1] = (
      SELECT supabase_uuid::text
      FROM public.user_profiles
      WHERE user_id = requesting_user_id()
    )
  );

-- Policy for DELETE operations (deleting images)
CREATE POLICY "Users can delete their own images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'future-self-images' AND 
    (storage.foldername(name))[1] = (
      SELECT supabase_uuid::text
      FROM public.user_profiles
      WHERE user_id = requesting_user_id()
    )
  );