/*
  # Set up RLS policies using Clerk session token data

  1. Functions
    - Create requesting_user_id() function to extract user ID from Clerk JWT
    
  2. Enable RLS
    - Enable RLS on all tables
    
  3. RLS Policies
    - Create policies for user_profiles, categories, goals, and motivations
    - Use Clerk JWT 'sub' claim to identify users
    - Ensure users can only access their own data
*/

-- Create function to get the requesting user's ID from Clerk JWT
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    (current_setting('request.jwt.claims', true)::json->>'user_id')
  );
$$;

-- Enable RLS on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE motivations ENABLE ROW LEVEL SECURITY;

-- User Profiles RLS Policies
CREATE POLICY "Users can view their own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (requesting_user_id() = user_id);

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

-- Categories RLS Policies
CREATE POLICY "Users can view all default categories and their own custom categories"
  ON categories
  FOR SELECT
  TO authenticated
  USING (
    (is_custom = false) OR 
    ((is_custom = true) AND (user_id = requesting_user_id()))
  );

CREATE POLICY "Users can create custom categories for themselves"
  ON categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (is_custom = true) AND (user_id = requesting_user_id())
  );

CREATE POLICY "Users can update their own custom categories"
  ON categories
  FOR UPDATE
  TO authenticated
  USING ((is_custom = true) AND (user_id = requesting_user_id()))
  WITH CHECK ((is_custom = true) AND (user_id = requesting_user_id()));

CREATE POLICY "Users can delete their own custom categories"
  ON categories
  FOR DELETE
  TO authenticated
  USING ((is_custom = true) AND (user_id = requesting_user_id()));

-- Goals RLS Policies
CREATE POLICY "Users can view their own goals"
  ON goals
  FOR SELECT
  TO authenticated
  USING (user_id = requesting_user_id());

CREATE POLICY "Users can create their own goals"
  ON goals
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = requesting_user_id());

CREATE POLICY "Users can update their own goals"
  ON goals
  FOR UPDATE
  TO authenticated
  USING (user_id = requesting_user_id())
  WITH CHECK (user_id = requesting_user_id());

CREATE POLICY "Users can delete their own goals"
  ON goals
  FOR DELETE
  TO authenticated
  USING (user_id = requesting_user_id());

-- Motivations RLS Policies
CREATE POLICY "Users can view motivations for their own goals"
  ON motivations
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM goals 
    WHERE goals.id = motivations.goal_id 
    AND goals.user_id = requesting_user_id()
  ));

CREATE POLICY "Users can create motivations for their own goals"
  ON motivations
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
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

CREATE POLICY "Users can delete motivations for their own goals"
  ON motivations
  FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM goals 
    WHERE goals.id = motivations.goal_id 
    AND goals.user_id = requesting_user_id()
  ));