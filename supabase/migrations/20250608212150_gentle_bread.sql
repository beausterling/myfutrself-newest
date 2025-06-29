/*
  # Update RLS policies to use requesting_user_id()

  1. Policy Updates
    - Replace auth.uid() with requesting_user_id() in all policies
    - Update JWT claim references to use requesting_user_id()
  
  2. Security
    - Ensures proper user isolation using Clerk's default JWT
    - Maintains data security with proper RLS enforcement

  This migration updates all existing RLS policies to work with Clerk's default JWT structure.
*/

-- Drop existing policies and recreate with requesting_user_id()

-- User Profiles policies
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON user_profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;

CREATE POLICY "Users can create their own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (requesting_user_id() = user_id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (requesting_user_id() = user_id)
  WITH CHECK (requesting_user_id() = user_id);

CREATE POLICY "Users can view their own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (requesting_user_id() = user_id);

-- Categories policies
DROP POLICY IF EXISTS "Users can create custom categories for themselves" ON categories;
DROP POLICY IF EXISTS "Users can delete their own custom categories" ON categories;
DROP POLICY IF EXISTS "Users can update their own custom categories" ON categories;
DROP POLICY IF EXISTS "Users can view all default categories and their own custom cate" ON categories;

CREATE POLICY "Users can create custom categories for themselves"
  ON categories
  FOR INSERT
  TO authenticated
  WITH CHECK ((is_custom = true) AND (user_id = requesting_user_id()));

CREATE POLICY "Users can delete their own custom categories"
  ON categories
  FOR DELETE
  TO authenticated
  USING ((is_custom = true) AND (user_id = requesting_user_id()));

CREATE POLICY "Users can update their own custom categories"
  ON categories
  FOR UPDATE
  TO authenticated
  USING ((is_custom = true) AND (user_id = requesting_user_id()))
  WITH CHECK ((is_custom = true) AND (user_id = requesting_user_id()));

CREATE POLICY "Users can view all default categories and their own custom categories"
  ON categories
  FOR SELECT
  TO authenticated
  USING ((is_custom = false) OR ((is_custom = true) AND (user_id = requesting_user_id())));

-- Goals policies
DROP POLICY IF EXISTS "Users can create their own goals" ON goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON goals;
DROP POLICY IF EXISTS "Users can view their own goals" ON goals;

CREATE POLICY "Users can create their own goals"
  ON goals
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = requesting_user_id());

CREATE POLICY "Users can delete their own goals"
  ON goals
  FOR DELETE
  TO authenticated
  USING (user_id = requesting_user_id());

CREATE POLICY "Users can update their own goals"
  ON goals
  FOR UPDATE
  TO authenticated
  USING (user_id = requesting_user_id())
  WITH CHECK (user_id = requesting_user_id());

CREATE POLICY "Users can view their own goals"
  ON goals
  FOR SELECT
  TO authenticated
  USING (user_id = requesting_user_id());

-- Motivations policies
DROP POLICY IF EXISTS "Users can create motivations for their own goals" ON motivations;
DROP POLICY IF EXISTS "Users can delete motivations for their own goals" ON motivations;
DROP POLICY IF EXISTS "Users can update motivations for their own goals" ON motivations;
DROP POLICY IF EXISTS "Users can view motivations for their own goals" ON motivations;

CREATE POLICY "Users can create motivations for their own goals"
  ON motivations
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM goals 
    WHERE goals.id = motivations.goal_id 
    AND goals.user_id = requesting_user_id()
  ));

CREATE POLICY "Users can delete motivations for their own goals"
  ON motivations
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM goals 
    WHERE goals.id = motivations.goal_id 
    AND goals.user_id = requesting_user_id()
  ));

CREATE POLICY "Users can update motivations for their own goals"
  ON motivations
  FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM goals 
    WHERE goals.id = motivations.goal_id 
    AND goals.user_id = requesting_user_id()
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM goals 
    WHERE goals.id = motivations.goal_id 
    AND goals.user_id = requesting_user_id()
  ));