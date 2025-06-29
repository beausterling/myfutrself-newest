/*
  # Add photo storage capabilities
  
  1. Changes
    - Add photo_url column to user_profiles table
    - Add photo_updated_at timestamp for tracking last photo change
    
  2. Security
    - Maintains existing RLS policies
    - Photo URL only accessible by the authenticated user
*/

-- Add photo storage columns
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS photo_updated_at TIMESTAMPTZ DEFAULT now();

-- Create a function to automatically update photo_updated_at
CREATE OR REPLACE FUNCTION update_photo_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.photo_url IS DISTINCT FROM NEW.photo_url THEN
    NEW.photo_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update timestamp when photo changes
DROP TRIGGER IF EXISTS update_user_profiles_photo_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_photo_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_photo_updated_at();