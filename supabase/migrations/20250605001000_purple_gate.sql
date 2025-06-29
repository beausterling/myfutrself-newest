/*
  # Update user_profiles schema for Clerk integration
  
  1. Changes
    - Drop existing RLS policy to allow column modification
    - Change user_id column from UUID to TEXT
    - Add index on user_id column
    - Recreate RLS policy for TEXT user_id
  
  2. Security
    - Maintains RLS protection
    - Updates policy to work with Clerk's string IDs
    
  Note: This migration preserves existing data while changing the column type
*/

-- Temporarily disable RLS to modify the table
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Drop the existing RLS policy
DROP POLICY IF EXISTS "Users can manage their own profile" ON user_profiles;

-- Drop the existing foreign key constraint if it exists
ALTER TABLE user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;

-- Modify the user_id column to TEXT
ALTER TABLE user_profiles
ALTER COLUMN user_id TYPE TEXT;

-- Create an index on user_id if it doesn't exist
DROP INDEX IF EXISTS idx_user_profiles_user_id;
CREATE INDEX idx_user_profiles_user_id ON user_profiles (user_id);

-- Re-enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Recreate the RLS policy for TEXT user_id
CREATE POLICY "Users can manage their own profile"
ON user_profiles
FOR ALL
TO authenticated
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);