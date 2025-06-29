/*
  # Fix category unique constraint for custom categories

  1. Changes
    - Drop existing unique constraint on category name
    - Add conditional unique constraints:
      - Default categories: unique name globally
      - Custom categories: unique name per user
    
  2. Security
    - Maintains existing RLS policies
    - Allows multiple users to have custom categories with same names
    - Prevents conflicts between users' custom categories
*/

-- Drop the existing unique constraint on name
ALTER TABLE categories DROP CONSTRAINT IF EXISTS categories_name_key;

-- Create conditional unique indexes
-- For default categories: globally unique names
CREATE UNIQUE INDEX IF NOT EXISTS unique_default_category_name 
  ON categories (name) 
  WHERE is_custom = false;

-- For custom categories: unique name per user
CREATE UNIQUE INDEX IF NOT EXISTS unique_custom_category_name_per_user 
  ON categories (name, user_id) 
  WHERE is_custom = true;