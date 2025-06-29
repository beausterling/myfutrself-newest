/*
  # Add custom_voice_audio_path column to user_profiles

  1. Schema Changes
    - Add `custom_voice_audio_path` column to `user_profiles` table
    - Set default value to NULL
    - Add index for performance

  2. Purpose
    - Store the path to user's uploaded voice recording in voice_recordings bucket
    - Enable voice cloning functionality by linking audio files to user profiles
*/

-- Add custom_voice_audio_path column to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS custom_voice_audio_path text DEFAULT NULL;

-- Add index for performance when querying users with custom voice recordings
CREATE INDEX IF NOT EXISTS idx_user_profiles_custom_voice_audio_path 
ON user_profiles (custom_voice_audio_path) 
WHERE custom_voice_audio_path IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.custom_voice_audio_path IS 'Path to user''s custom voice recording in voice_recordings bucket for voice cloning';