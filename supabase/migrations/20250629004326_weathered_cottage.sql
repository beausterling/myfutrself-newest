/*
  # Add twilio_setup_completed column to user_profiles

  1. Schema Changes
    - Add `twilio_setup_completed` column to `user_profiles` table
    - Set default value to `false`
    - Add index for performance

  2. Purpose
    - Track completion of Twilio setup step in onboarding
    - Ensure users return to correct onboarding step
*/

-- Add twilio_setup_completed column to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS twilio_setup_completed boolean DEFAULT false;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_twilio_setup 
ON user_profiles (twilio_setup_completed);

-- Update existing users to have twilio_setup_completed = false by default
-- (This is already handled by the DEFAULT false constraint)