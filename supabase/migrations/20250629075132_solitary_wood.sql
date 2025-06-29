/*
  # Set consistent category display order
  
  1. Changes
    - Ensure display_order column exists on categories table
    - Set specific display order values for default categories to match initial selection step
    - Ensure custom categories always appear last
    - Add index for efficient ordering queries
    
  2. Purpose
    - Maintain consistent category ordering throughout the onboarding flow
    - Match the order from the initial category selection step
    - Improve user experience with predictable category ordering
*/

-- Make sure display_order column exists
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 999;

-- Set display order for default categories to match initial selection order
UPDATE categories SET display_order = 10 WHERE name ILIKE 'side-project';
UPDATE categories SET display_order = 20 WHERE name ILIKE 'relationships';
UPDATE categories SET display_order = 30 WHERE name ILIKE 'exercise';
UPDATE categories SET display_order = 40 WHERE name ILIKE 'nutrition';
UPDATE categories SET display_order = 50 WHERE name ILIKE 'finances';
UPDATE categories SET display_order = 60 WHERE name ILIKE 'mental-fitness';
UPDATE categories SET display_order = 70 WHERE name ILIKE 'sleep';

-- Custom categories should always be last
UPDATE categories SET display_order = 999 WHERE is_custom = true;

-- Add index for efficient ordering if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON categories(display_order);