/*
  # Remove email availability columns

  1. Columns to remove
    - `email_notifications_enabled` (boolean)
    - `preferred_email_time_start` (time)
    - `preferred_email_time_end` (time)
  
  2. Indexes to remove
    - Related email notification indexes
*/

-- Remove email availability columns
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'email_notifications_enabled'
  ) THEN
    ALTER TABLE user_profiles DROP COLUMN email_notifications_enabled;
  END IF;
END $$;

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

-- Remove related indexes
DROP INDEX IF EXISTS idx_user_profiles_email_notifications;
DROP INDEX IF EXISTS idx_user_profiles_email_times;