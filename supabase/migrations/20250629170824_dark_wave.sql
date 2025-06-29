/*
  # Add 24-hour availability flags to user_profiles

  1. New Columns
    - `phone_24_hour_availability` (boolean, default false) - Direct flag for phone 24-hour availability
    - `sms_24_hour_availability` (boolean, default false) - Direct flag for SMS 24-hour availability

  2. Purpose
    - Simplify 24-hour availability persistence logic
    - Remove dependency on time value interpretation (00:00-23:59)
    - Provide clear boolean flags for UI state management

  3. Data Migration
    - Set flags to true for existing users with 00:00-23:59 time windows
    - Maintain backward compatibility with existing time preferences
*/

-- Add phone 24-hour availability flag
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS phone_24_hour_availability boolean DEFAULT false;

-- Add SMS 24-hour availability flag  
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS sms_24_hour_availability boolean DEFAULT false;

-- Migrate existing data: set flags to true for users with 00:00-23:59 time windows
UPDATE user_profiles 
SET phone_24_hour_availability = true 
WHERE preferred_time_start = '00:00' AND preferred_time_end = '23:59';

UPDATE user_profiles 
SET sms_24_hour_availability = true 
WHERE preferred_sms_time_start = '00:00' AND preferred_sms_time_end = '23:59';

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone_24_hour 
ON user_profiles (phone_24_hour_availability) 
WHERE phone_24_hour_availability = true;

CREATE INDEX IF NOT EXISTS idx_user_profiles_sms_24_hour 
ON user_profiles (sms_24_hour_availability) 
WHERE sms_24_hour_availability = true;

-- Add comments for documentation
COMMENT ON COLUMN user_profiles.phone_24_hour_availability IS 'Direct flag indicating if user is available for phone calls 24 hours';
COMMENT ON COLUMN user_profiles.sms_24_hour_availability IS 'Direct flag indicating if user is available for SMS messages 24 hours';