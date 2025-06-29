/*
  # Re-add email_notifications_enabled column

  1. New Columns
    - `email_notifications_enabled` (boolean, default false) - Tracks if user wants email notifications
  
  2. Removed Columns
    - Ensures `preferred_email_time_start` and `preferred_email_time_end` are not present
  
  3. Security
    - No RLS changes needed as this extends existing user_profiles table
  
  4. Indexes
    - Add index for efficient querying of users with email notifications enabled
*/

-- Add email_notifications_enabled column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'email_notifications_enabled'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN email_notifications_enabled boolean DEFAULT false;
  END IF;
END $$;

-- Ensure email time columns are removed if they exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'preferred_email_time_start'
  ) THEN
    ALTER TABLE user_profiles DROP COLUMN preferred_email_time_start;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'preferred_email_time_end'
  ) THEN
    ALTER TABLE user_profiles DROP COLUMN preferred_email_time_end;
  END IF;
END $$;

-- Create index for efficient querying of users with email notifications enabled
CREATE INDEX IF NOT EXISTS idx_user_profiles_email_notifications ON user_profiles (email_notifications_enabled) WHERE email_notifications_enabled = true;

-- Remove any orphaned email time indexes
DROP INDEX IF EXISTS idx_user_profiles_email_times;