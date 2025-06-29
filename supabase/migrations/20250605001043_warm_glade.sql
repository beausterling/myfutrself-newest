/*
  # Fix user_profiles schema for Clerk integration
  
  1. Changes
    - Temporarily disable RLS
    - Drop existing policy and constraints
    - Modify user_id column to TEXT
    - Update indexing strategy
    - Re-enable RLS with updated policy
  
  2. Security
    - Recreates RLS policy to work with text-based user IDs
    - Maintains row-level security throughout
*/

-- Step 1: Temporarily disable RLS
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policy
DROP POLICY IF EXISTS "Users can manage their own profile" ON user_profiles;

-- Step 3: Drop existing foreign key constraint
ALTER TABLE user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;

-- Step 4: Modify column type
ALTER TABLE user_profiles
ALTER COLUMN user_id TYPE TEXT;

-- Step 5: Update index
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