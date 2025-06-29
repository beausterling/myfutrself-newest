/*
  # Add custom voice audio path column to user_profiles

  1. New Columns
    - `custom_voice_audio_path` (text) - Path to user's custom voice recording in voice_recordings bucket for voice cloning

  2. Purpose
    - Store the path to user's custom voice recording in Supabase Storage
    - Enable voice cloning functionality with ElevenLabs
    - Track which users have uploaded custom voice recordings

  3. Security
    - No RLS changes needed as this extends existing user_profiles table
    - Users can only access their own voice recordings through existing policies
*/

-- Add custom_voice_audio_path column to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS custom_voice_audio_path text;

-- Add index for efficient querying of users with custom voice recordings
CREATE INDEX IF NOT EXISTS idx_user_profiles_custom_voice_audio_path 
ON user_profiles (custom_voice_audio_path) 
WHERE custom_voice_audio_path IS NOT NULL;

-- Add comment to document the column purpose
COMMENT ON COLUMN user_profiles.custom_voice_audio_path IS 'Path to user''s custom voice recording in voice_recordings bucket for voice cloning';