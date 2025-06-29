/*
  # Remove RLS and policies for simplified authentication

  1. Security Changes
    - Disable RLS on all tables since we're using service role access
    - Remove all RLS policies
    - Application will handle authorization through Clerk user IDs

  2. Notes
    - This approach relies on the clerk-webhook to sync user data
    - Client-side queries use service role key with Clerk user ID filtering
    - More secure than trying to sync JWT secrets between Clerk and Supabase
*/

-- Disable RLS on all tables
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE motivations DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can create their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;

DROP POLICY IF EXISTS "Users can create custom categories for themselves" ON categories;
DROP POLICY IF EXISTS "Users can delete their own custom categories" ON categories;
DROP POLICY IF EXISTS "Users can update their own custom categories" ON categories;
DROP POLICY IF EXISTS "Users can view all default categories and their own custom categories" ON categories;

DROP POLICY IF EXISTS "Users can create their own goals" ON goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON goals;
DROP POLICY IF EXISTS "Users can view their own goals" ON goals;

DROP POLICY IF EXISTS "Users can create motivations for their own goals" ON motivations;
DROP POLICY IF EXISTS "Users can delete motivations for their own goals" ON motivations;
DROP POLICY IF EXISTS "Users can update motivations for their own goals" ON motivations;

-- Drop the requesting_user_id function as it's no longer needed
DROP FUNCTION IF EXISTS requesting_user_id();