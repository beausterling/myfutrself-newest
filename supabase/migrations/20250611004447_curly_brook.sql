/*
  # Create user_selected_categories table

  1. New Tables
    - `user_selected_categories`
      - `id` (uuid, primary key)
      - `user_id` (text, foreign key to user_profiles)
      - `category_id` (uuid, foreign key to categories)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
  
  2. Security
    - Enable RLS on `user_selected_categories` table
    - Add policies for authenticated users to manage their own selections
  
  3. Constraints
    - Unique constraint on (user_id, category_id) to prevent duplicates
    - Foreign key constraints for data integrity
*/

-- Create the user_selected_categories table
CREATE TABLE IF NOT EXISTS user_selected_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  category_id uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Foreign key constraints
  CONSTRAINT fk_user_selected_categories_user_id 
    FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE,
  CONSTRAINT fk_user_selected_categories_category_id 
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    
  -- Unique constraint to prevent duplicate selections
  CONSTRAINT unique_user_category_selection 
    UNIQUE (user_id, category_id)
);

-- Enable Row Level Security
ALTER TABLE user_selected_categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own category selections"
  ON user_selected_categories
  FOR SELECT
  TO authenticated
  USING (requesting_user_id() = user_id);

CREATE POLICY "Users can insert their own category selections"
  ON user_selected_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (requesting_user_id() = user_id);

CREATE POLICY "Users can delete their own category selections"
  ON user_selected_categories
  FOR DELETE
  TO authenticated
  USING (requesting_user_id() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_selected_categories_user_id 
  ON user_selected_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_user_selected_categories_category_id 
  ON user_selected_categories(category_id);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_selected_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_selected_categories_updated_at
  BEFORE UPDATE ON user_selected_categories
  FOR EACH ROW EXECUTE FUNCTION update_user_selected_categories_updated_at();