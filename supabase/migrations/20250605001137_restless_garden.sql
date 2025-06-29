/*
  # Update user_profiles for Clerk Integration

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

-- Step 1: Disable RLS temporarily
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policy
DROP POLICY IF EXISTS "Users can manage their own profile" ON user_profiles;

-- Step 3: Drop existing foreign key constraint
ALTER TABLE user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;

-- Step 4: Modify column type
ALTER TABLE user_profiles
ALTER COLUMN user_id TYPE TEXT;

-- Step 5: Create index for performance
DROP INDEX IF EXISTS idx_user_profiles_user_id;
CREATE INDEX idx_user_profiles_user_id ON user_profiles (user_id);

-- Step 6: Re-enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 7: Create new policy for text-based user_id
CREATE POLICY "Users can manage their own profile"
ON user_profiles
FOR ALL
TO authenticated
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);