/*
  # Fix user_id column types and constraints for Clerk integration
  
  1. Changes
    - Drop all existing RLS policies first to avoid dependency errors
    - Change user_id columns from UUID to TEXT in categories and goals tables
    - Update foreign key constraints to use CASCADE DELETE
    - Add performance indexes
    - Recreate RLS policies for TEXT user_id columns
    
  2. Security
    - Maintains RLS protection after column type changes
    - Updates policies to work with Clerk's string user IDs
*/

-- Step 1: Drop all existing RLS policies to avoid dependency errors
DROP POLICY IF EXISTS "Users can view all default categories and their own custom cate" ON categories;
DROP POLICY IF EXISTS "Users can view all default categories and their own custom categories" ON categories;
DROP POLICY IF EXISTS "Users can view default categories and manage their custom ones" ON categories;
DROP POLICY IF EXISTS "Users can create custom categories for themselves" ON categories;
DROP POLICY IF EXISTS "Users can update their own custom categories" ON categories;
DROP POLICY IF EXISTS "Users can delete their own custom categories" ON categories;

DROP POLICY IF EXISTS "Users can manage their own goals" ON goals;
DROP POLICY IF EXISTS "Users can view their own goals" ON goals;
DROP POLICY IF EXISTS "Users can create their own goals" ON goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON goals;

DROP POLICY IF EXISTS "Users can manage their own motivations" ON motivations;
DROP POLICY IF EXISTS "Users can view motivations for their own goals" ON motivations;
DROP POLICY IF EXISTS "Users can create motivations for their own goals" ON motivations;
DROP POLICY IF EXISTS "Users can update motivations for their own goals" ON motivations;
DROP POLICY IF EXISTS "Users can delete motivations for their own goals" ON motivations;

-- Step 2: Add ON DELETE CASCADE to motivations.goal_id
ALTER TABLE motivations
DROP CONSTRAINT IF EXISTS motivations_goal_id_fkey,
ADD CONSTRAINT motivations_goal_id_fkey
  FOREIGN KEY (goal_id)
  REFERENCES goals(id)
  ON DELETE CASCADE;

-- Step 3: Modify categories table
-- Drop existing foreign key constraint
ALTER TABLE categories
DROP CONSTRAINT IF EXISTS categories_user_id_fkey;

-- Change column type from UUID to TEXT
ALTER TABLE categories
ALTER COLUMN user_id TYPE TEXT;

-- Add new foreign key constraint pointing to user_profiles(user_id) instead of auth.users
ALTER TABLE categories
ADD CONSTRAINT categories_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES user_profiles(user_id)
  ON DELETE CASCADE;

-- Step 4: Modify goals table
-- Drop existing foreign key constraint
ALTER TABLE goals
DROP CONSTRAINT IF EXISTS goals_user_id_fkey,
DROP CONSTRAINT IF EXISTS goals_category_id_fkey;

-- Change column type from UUID to TEXT
ALTER TABLE goals
ALTER COLUMN user_id TYPE TEXT;

-- Add new foreign key constraints
ALTER TABLE goals
ADD CONSTRAINT goals_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES user_profiles(user_id)
  ON DELETE CASCADE,
ADD CONSTRAINT goals_category_id_fkey
  FOREIGN KEY (category_id)
  REFERENCES categories(id)
  ON DELETE CASCADE;

-- Step 5: Add missing indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_is_custom ON categories(is_custom);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_category_id ON goals(category_id);
CREATE INDEX IF NOT EXISTS idx_motivations_goal_id ON motivations(goal_id);

-- Step 6: Recreate RLS policies with TEXT user_id support
-- Categories policies
CREATE POLICY "Users can view all default categories and their own custom categories"
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