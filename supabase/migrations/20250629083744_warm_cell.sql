/*
  # Add contact preferences column

  1. New Columns
    - `contact_prefs` (text array) - stores selected contact methods like ['phone', 'email', 'sms']
    - `ai_triggered_enabled` (boolean) - indicates if AI-triggered calls are enabled
    - `email_notifications_enabled` (boolean) - indicates if email notifications are enabled
    - `preferred_email_time_start` (time) - start time for email notifications
    - `preferred_email_time_end` (time) - end time for email notifications
    - `sms_notifications_enabled` (boolean) - indicates if SMS notifications are enabled
    - `preferred_sms_time_start` (time) - start time for SMS notifications
    - `preferred_sms_time_end` (time) - end time for SMS notifications

  2. Changes
    - Replace call_mode functionality with contact_prefs array and ai_triggered_enabled boolean
    - Add comprehensive contact method preferences
*/

-- Add contact_prefs column to store array of preferred contact methods
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'contact_prefs'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN contact_prefs text[] DEFAULT '{}';
  END IF;
END $$;

-- Add ai_triggered_enabled column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'ai_triggered_enabled'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN ai_triggered_enabled boolean DEFAULT false;
  END IF;
END $$;

-- Add email notification columns if they don't exist
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
    ALTER TABLE user_profiles ADD COLUMN preferred_email_time_start time without time zone;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'preferred_email_time_end'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN preferred_email_time_end time without time zone;
  END IF;
END $$;

-- Add SMS notification columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'sms_notifications_enabled'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN sms_notifications_enabled boolean DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'preferred_sms_time_start'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN preferred_sms_time_start time without time zone;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'preferred_sms_time_end'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN preferred_sms_time_end time without time zone;
  END IF;
END $$;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_user_profiles_contact_prefs ON user_profiles USING gin(contact_prefs);
CREATE INDEX IF NOT EXISTS idx_user_profiles_ai_triggered ON user_profiles (ai_triggered_enabled) WHERE ai_triggered_enabled = true;
CREATE INDEX IF NOT EXISTS idx_user_profiles_sms_notifications ON user_profiles (sms_notifications_enabled) WHERE sms_notifications_enabled = true;