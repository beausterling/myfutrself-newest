/*
  # Add RLS policies for user_profiles table

  1. Changes
    - Add RLS policies to allow authenticated users to:
      - Create their own profile
      - Read their own profile
      - Update their own profile

  2. Security
    - Ensures users can only access and modify their own profile data
    - Uses auth.uid() to match against user_id for secure access control
*/

-- Enable RLS if not already enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Policy for INSERT operations
CREATE POLICY "Users can create their own profile"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = user_id);

-- Policy for SELECT operations
CREATE POLICY "Users can view their own profile"
ON user_profiles
FOR SELECT
TO authenticated
USING (auth.uid()::text = user_id);

-- Policy for UPDATE operations
CREATE POLICY "Users can update their own profile"
ON user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid()::text = user_id)
WITH CHECK (auth.uid()::text = user_id);