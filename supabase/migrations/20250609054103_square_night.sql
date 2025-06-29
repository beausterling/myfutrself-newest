-- First, drop all existing policies that depend on user_id columns
DROP POLICY IF EXISTS "Users can view all default categories and their own custom cate" ON categories;
DROP POLICY IF EXISTS "Users can create custom categories for themselves" ON categories;
DROP POLICY IF EXISTS "Users can update their own custom categories" ON categories;
DROP POLICY IF EXISTS "Users can delete their own custom categories" ON categories;
DROP POLICY IF EXISTS "Users can view their own goals" ON goals;
DROP POLICY IF EXISTS "Users can create their own goals" ON goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON goals;
DROP POLICY IF EXISTS "Users can view motivations for their own goals" ON motivations;
DROP POLICY IF EXISTS "Users can create motivations for their own goals" ON motivations;
DROP POLICY IF EXISTS "Users can update motivations for their own goals" ON motivations;
DROP POLICY IF EXISTS "Users can delete motivations for their own goals" ON motivations;

-- Drop existing foreign key constraints
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_user_id_fkey;
ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_user_id_fkey;
ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_category_id_fkey;
ALTER TABLE motivations DROP CONSTRAINT IF EXISTS motivations_goal_id_fkey;

-- Now we can safely alter the column types
ALTER TABLE categories ALTER COLUMN user_id TYPE TEXT;
ALTER TABLE goals ALTER COLUMN user_id TYPE TEXT;

-- Add foreign key constraints with CASCADE delete
ALTER TABLE categories
ADD CONSTRAINT categories_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES user_profiles(user_id)
  ON DELETE CASCADE;

ALTER TABLE goals
ADD CONSTRAINT goals_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES user_profiles(user_id)
  ON DELETE CASCADE;

ALTER TABLE goals
ADD CONSTRAINT goals_category_id_fkey
  FOREIGN KEY (category_id)
  REFERENCES categories(id)
  ON DELETE CASCADE;

ALTER TABLE motivations
ADD CONSTRAINT motivations_goal_id_fkey
  FOREIGN KEY (goal_id)
  REFERENCES goals(id)
  ON DELETE CASCADE;

-- Add missing indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_is_custom ON categories(is_custom);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_category_id ON goals(category_id);
CREATE INDEX IF NOT EXISTS idx_motivations_goal_id ON motivations(goal_id);

-- Recreate RLS policies with correct user_id handling

-- Categories policies
CREATE POLICY "Users can view all default categories and their own custom cate"
  ON categories
  FOR SELECT
  TO authenticated
  USING (is_custom = false OR (is_custom = true AND user_id = requesting_user_id()));

CREATE POLICY "Users can create custom categories for themselves"
  ON categories
  FOR INSERT
  TO authenticated
  WITH CHECK (is_custom = true AND user_id = requesting_user_id());

CREATE POLICY "Users can update their own custom categories"
  ON categories
  FOR UPDATE
  TO authenticated
  USING (is_custom = true AND user_id = requesting_user_id())
  WITH CHECK (is_custom = true AND user_id = requesting_user_id());

CREATE POLICY "Users can delete their own custom categories"
  ON categories
  FOR DELETE
  TO authenticated
  USING (is_custom = true AND user_id = requesting_user_id());

-- Goals policies
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

-- Motivations policies
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