/*
  # Add video call interest column to user_profiles

  1. Changes
    - Add `video_call_interest` boolean column to `user_profiles` table
    - Set default value to `false`
    - Allow null values for backward compatibility
    - Add index for efficient querying of interested users

  2. Security
    - No RLS changes needed as this inherits existing user_profiles policies
    - Users can only update their own video call interest preference
*/

-- Add video_call_interest column to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS video_call_interest boolean DEFAULT false;

-- Add index for efficient querying of users interested in video calls
CREATE INDEX IF NOT EXISTS idx_user_profiles_video_call_interest 
ON user_profiles (video_call_interest) 
WHERE video_call_interest = true;

-- Add comment to document the column purpose
COMMENT ON COLUMN user_profiles.video_call_interest IS 'Indicates if user is interested in video call feature (coming soon)';