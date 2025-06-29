/*
  # Add email contact support to user profiles

  1. New Columns
    - `email_notifications_enabled` (boolean) - Whether user wants email notifications
    - `preferred_email_time_start` (time) - Start time for email notifications  
    - `preferred_email_time_end` (time) - End time for email notifications

  2. Security
    - No RLS changes needed as this extends existing user_profiles table

  3. Changes
    - Add email notification preferences to user_profiles table
    - Set default values for new columns
*/

-- Add email notification preferences to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'email_notifications_enabled'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN email_notifications_enabled boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'preferred_email_time_start'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN preferred_email_time_start time without time zone DEFAULT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'preferred_email_time_end'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN preferred_email_time_end time without time zone DEFAULT NULL;
  END IF;
END $$;

-- Add indexes for email notification queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_email_notifications 
ON user_profiles (email_notifications_enabled) 
WHERE email_notifications_enabled = true;

CREATE INDEX IF NOT EXISTS idx_user_profiles_email_times 
ON user_profiles (preferred_email_time_start, preferred_email_time_end) 
WHERE email_notifications_enabled = true;