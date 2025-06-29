/*
  # Create onboarding tables

  1. New Tables
    - `user_profiles`
      - Basic user information and preferences
      - Stores avatar/photo, selected voice, call preferences
    - `categories`
      - Predefined and custom categories for goals
    - `goals`
      - User goals with deadlines and frequencies
    - `motivations`
      - Goal motivations and obstacles
    
  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  avatar_url text,
  voice_preference text NOT NULL DEFAULT 'friendly_mentor',
  call_mode text NOT NULL DEFAULT 'user_initiated',
  preferred_time_start time,
  preferred_time_end time,
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_custom boolean DEFAULT false,
  user_id uuid REFERENCES auth.users,
  created_at timestamptz DEFAULT now()
);

-- Create goals table
CREATE TABLE IF NOT EXISTS goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  category_id uuid REFERENCES categories NOT NULL,
  title text NOT NULL,
  deadline date,
  frequency text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create motivations table
CREATE TABLE IF NOT EXISTS motivations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid REFERENCES goals NOT NULL,
  motivation_text text NOT NULL,
  obstacles text[],
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE motivations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own profile"
  ON user_profiles
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view default categories and manage their custom ones"
  ON categories
  USING (is_custom = false OR (is_custom = true AND auth.uid() = user_id));

CREATE POLICY "Users can manage their own goals"
  ON goals
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own motivations"
  ON motivations
  USING (EXISTS (
    SELECT 1 FROM goals 
    WHERE goals.id = motivations.goal_id 
    AND goals.user_id = auth.uid()
  ));

-- Insert default categories
INSERT INTO categories (name, description, is_custom) VALUES
  ('Side-Project', 'Personal projects and creative endeavors', false),
  ('Relationships', 'Building and maintaining meaningful connections', false),
  ('Exercise', 'Physical fitness and activity goals', false),
  ('Nutrition', 'Healthy eating and dietary goals', false),
  ('Finances', 'Financial planning and management', false),
  ('Mental Fitness', 'Mental health and personal growth', false),
  ('Sleep', 'Sleep quality and habits', false)
ON CONFLICT DO NOTHING;