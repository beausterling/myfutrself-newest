/*
  # Fix user_profiles table schema for photo storage

  1. Changes
    - Add missing photo_url column to user_profiles table
    - Add missing future_photo_url column if not exists
    - Add missing photo_updated_at and future_photo_updated_at columns
    - Ensure all columns match the TypeScript types

  2. Security
    - Maintains existing RLS policies
    - No changes to access control
*/

-- Add missing photo columns to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS photo_url text,
ADD COLUMN IF NOT EXISTS future_photo_url text,
ADD COLUMN IF NOT EXISTS photo_updated_at timestamptz DEFAULT now(),
ADD COLUMN IF NOT EXISTS future_photo_updated_at timestamptz DEFAULT now();

-- Ensure the photo trigger function exists and handles all photo columns
CREATE OR REPLACE FUNCTION update_photo_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.photo_url IS DISTINCT FROM NEW.photo_url THEN
    NEW.photo_updated_at = now();
  END IF;
  IF OLD.future_photo_url IS DISTINCT FROM NEW.future_photo_url THEN
    NEW.future_photo_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create or replace the trigger
DROP TRIGGER IF EXISTS update_user_profiles_photo_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_photo_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_photo_updated_at();