/*
  # Add video call interest column

  1. New Columns
    - `video_call_interest` (boolean) - Indicates if user is interested in video call feature (coming soon)

  2. Security
    - Add index for efficient querying of users interested in video calls

  3. Changes
    - Add video_call_interest column with default false
    - Create index for performance optimization
*/

-- Add video_call_interest column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'video_call_interest'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN video_call_interest boolean DEFAULT false;
    COMMENT ON COLUMN user_profiles.video_call_interest IS 'Indicates if user is interested in video call feature (coming soon)';
  END IF;
END $$;

-- Create index for efficient querying of users interested in video calls
CREATE INDEX IF NOT EXISTS idx_user_profiles_video_call_interest ON user_profiles (video_call_interest) WHERE video_call_interest = true;