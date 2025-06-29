/*
  # Update Schema for Data Integrity and User Management
  
  1. Changes
    - Add missing tables if they don't exist
    - Update foreign key constraints with ON DELETE CASCADE
    - Convert user_id columns to TEXT type
    - Add performance indexes
    - Update RLS policies
    
  2. Security
    - Maintain RLS protection
    - Update policies for text-based user IDs
*/

-- Create tables if they don't exist
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_custom boolean DEFAULT false,
  user_id text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  category_id uuid REFERENCES categories(id) ON DELETE CASCADE,
  title text NOT NULL,
  deadline date,
  frequency text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS motivations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL,
  motivation_text text NOT NULL,
  obstacles text[],
  created_at timestamptz DEFAULT now()
);

-- Add foreign key constraints with CASCADE
ALTER TABLE motivations
DROP CONSTRAINT IF EXISTS motivations_goal_id_fkey,
ADD CONSTRAINT motivations_goal_id_fkey
  FOREIGN KEY (goal_id)
  REFERENCES goals(id)
  ON DELETE CASCADE;

-- Add missing indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
CREATE INDEX IF NOT EXISTS idx_goals_user_category ON goals(user_id, category_id);
CREATE INDEX IF NOT EXISTS idx_motivations_goal ON motivations(goal_id);

-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE motivations ENABLE ROW LEVEL SECURITY;

-- Update RLS policies
DROP POLICY IF EXISTS "Users can view default categories and manage their custom ones" ON categories;
DROP POLICY IF EXISTS "Users can manage their own goals" ON goals;
DROP POLICY IF EXISTS "Users can manage their own motivations" ON motivations;

-- Recreate policies with TEXT user_id
CREATE POLICY "Users can view default categories and manage their custom ones"
  ON categories
  FOR ALL
  TO authenticated
  USING (is_custom = false OR (is_custom = true AND auth.uid()::text = user_id))
  WITH CHECK (is_custom = true AND auth.uid()::text = user_id);

CREATE POLICY "Users can manage their own goals"
  ON goals
  FOR ALL
  TO authenticated
  USING (auth.uid()::text = user_id)
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can manage their own motivations"
  ON motivations
  FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM goals 
    WHERE goals.id = motivations.goal_id 
    AND goals.user_id = auth.uid()::text
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM goals 
    WHERE goals.id = motivations.goal_id 
    AND goals.user_id = auth.uid()::text
  ));