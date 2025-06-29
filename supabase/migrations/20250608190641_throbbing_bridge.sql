/*
  # Create Application Tables

  1. New Tables
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text, unique, not null)
      - `description` (text)
      - `is_custom` (boolean, default false)
      - `user_id` (text, foreign key to user_profiles.user_id, nullable for default categories)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
    
    - `goals`
      - `id` (uuid, primary key)
      - `user_id` (text, foreign key to user_profiles.user_id, not null)
      - `category_id` (uuid, foreign key to categories.id, not null)
      - `title` (text, not null)
      - `deadline` (date, nullable)
      - `frequency` (text, nullable)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
    
    - `motivations`
      - `id` (uuid, primary key)
      - `goal_id` (uuid, foreign key to goals.id, not null)
      - `motivation_text` (text, nullable)
      - `obstacles` (text array, nullable)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())

  2. Security
    - Enable RLS on all tables
    - Add comprehensive CRUD policies for authenticated users
    - Ensure users can only access their own data
    - Allow access to default (non-custom) categories for all users

  3. Initial Data
    - Insert default categories (Side Project, Relationships, Exercise, etc.)
    - Set up proper indexing for performance

  4. Foreign Key Relationships
    - categories.user_id → user_profiles.user_id (CASCADE DELETE)
    - goals.user_id → user_profiles.user_id (CASCADE DELETE)
    - goals.category_id → categories.id (CASCADE DELETE)
    - motivations.goal_id → goals.id (CASCADE DELETE)
*/

-- ============================================================================
-- 1. CREATE CATEGORIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  is_custom boolean DEFAULT false,
  user_id text REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories
CREATE POLICY "Users can view all default categories and their own custom categories"
  ON categories
  FOR SELECT
  TO authenticated
  USING (
    is_custom = false OR 
    (is_custom = true AND user_id = (SELECT auth.jwt() ->> 'sub'))
  );

CREATE POLICY "Users can create custom categories for themselves"
  ON categories
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_custom = true AND 
    user_id = (SELECT auth.jwt() ->> 'sub')
  );

CREATE POLICY "Users can update their own custom categories"
  ON categories
  FOR UPDATE
  TO authenticated
  USING (
    is_custom = true AND 
    user_id = (SELECT auth.jwt() ->> 'sub')
  )
  WITH CHECK (
    is_custom = true AND 
    user_id = (SELECT auth.jwt() ->> 'sub')
  );

CREATE POLICY "Users can delete their own custom categories"
  ON categories
  FOR DELETE
  TO authenticated
  USING (
    is_custom = true AND 
    user_id = (SELECT auth.jwt() ->> 'sub')
  );

-- ============================================================================
-- 2. CREATE GOALS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  title text NOT NULL,
  deadline date,
  frequency text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for goals
CREATE POLICY "Users can view their own goals"
  ON goals
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.jwt() ->> 'sub'));

CREATE POLICY "Users can create their own goals"
  ON goals
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.jwt() ->> 'sub'));

CREATE POLICY "Users can update their own goals"
  ON goals
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.jwt() ->> 'sub'))
  WITH CHECK (user_id = (SELECT auth.jwt() ->> 'sub'));

CREATE POLICY "Users can delete their own goals"
  ON goals
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.jwt() ->> 'sub'));

-- ============================================================================
-- 3. CREATE MOTIVATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS motivations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  motivation_text text,
  obstacles text[],
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE motivations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for motivations
CREATE POLICY "Users can view motivations for their own goals"
  ON motivations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM goals 
      WHERE goals.id = motivations.goal_id 
      AND goals.user_id = (SELECT auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY "Users can create motivations for their own goals"
  ON motivations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM goals 
      WHERE goals.id = motivations.goal_id 
      AND goals.user_id = (SELECT auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY "Users can update motivations for their own goals"
  ON motivations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM goals 
      WHERE goals.id = motivations.goal_id 
      AND goals.user_id = (SELECT auth.jwt() ->> 'sub')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM goals 
      WHERE goals.id = motivations.goal_id 
      AND goals.user_id = (SELECT auth.jwt() ->> 'sub')
    )
  );

CREATE POLICY "Users can delete motivations for their own goals"
  ON motivations
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM goals 
      WHERE goals.id = motivations.goal_id 
      AND goals.user_id = (SELECT auth.jwt() ->> 'sub')
    )
  );

-- ============================================================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ============================================================================

-- Index for categories
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_is_custom ON categories(is_custom);

-- Index for goals
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_category_id ON goals(category_id);

-- Index for motivations
CREATE INDEX IF NOT EXISTS idx_motivations_goal_id ON motivations(goal_id);

-- ============================================================================
-- 5. INSERT DEFAULT CATEGORIES
-- ============================================================================

INSERT INTO categories (name, description, is_custom, user_id) VALUES
  ('side-project', 'Turn your ideas into reality', false, null),
  ('relationships', 'Strengthen your connections', false, null),
  ('exercise', 'Achieve your fitness goals', false, null),
  ('nutrition', 'Develop healthy eating habits', false, null),
  ('finances', 'Build your financial future', false, null),
  ('mental-fitness', 'Strengthen your mind', false, null),
  ('sleep', 'Improve your rest quality', false, null)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 6. CREATE UPDATED_AT TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables
CREATE TRIGGER update_categories_updated_at 
  BEFORE UPDATE ON categories 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at 
  BEFORE UPDATE ON goals 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_motivations_updated_at 
  BEFORE UPDATE ON motivations 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();