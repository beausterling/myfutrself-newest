/*
  # Set voice_preference to NULL by default
  
  1. Changes
    - Remove default value from voice_preference column
    - Make voice_preference nullable
    - Update existing rows with default value to NULL
    
  2. Purpose
    - Ensure voice_preference is NULL until explicitly set by user
    - Fix onboarding flow to correctly identify incomplete voice selection
    - Improve tracking of onboarding progress
*/

-- Make voice_preference nullable and remove default value
ALTER TABLE user_profiles 
ALTER COLUMN voice_preference DROP NOT NULL,
ALTER COLUMN voice_preference DROP DEFAULT;

-- Update existing rows with default value to NULL
UPDATE user_profiles
SET voice_preference = NULL
WHERE voice_preference = 'friendly_mentor';