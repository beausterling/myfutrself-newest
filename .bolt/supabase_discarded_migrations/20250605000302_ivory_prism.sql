/*
  # Update user_profiles schema for Clerk integration
  
  1. Changes
    - Modify user_id column from UUID to TEXT
    - Drop existing foreign key constraint
    - Add index on user_id column
    
  2. Security
    - Maintain existing RLS policies
*/

-- Drop the existing foreign key constraint
ALTER TABLE user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;

-- Modify the user_id column to TEXT
ALTER TABLE user_profiles
ALTER COLUMN user_id TYPE TEXT;

-- Create an index on user_id if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id_text
ON user_profiles (user_id);