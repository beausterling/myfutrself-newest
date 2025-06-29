/*
  # Add display_order to categories table

  1. Changes
    - Add display_order column to categories table
    - Set default display order for existing categories
    - Add index for efficient ordering

  2. Purpose
    - Ensure consistent category display order across all pages
    - Maintain side-project first, custom categories last ordering
*/

-- Add display_order column to categories table
ALTER TABLE categories 
ADD COLUMN IF NOT EXISTS display_order integer DEFAULT 999;

-- Set display order for default categories
UPDATE categories SET display_order = 10 WHERE name = 'side-project';
UPDATE categories SET display_order = 20 WHERE name = 'relationships';
UPDATE categories SET display_order = 30 WHERE name = 'exercise';
UPDATE categories SET display_order = 40 WHERE name = 'nutrition';
UPDATE categories SET display_order = 50 WHERE name = 'finances';
UPDATE categories SET display_order = 60 WHERE name = 'mental-fitness';
UPDATE categories SET display_order = 70 WHERE name = 'sleep';

-- Custom categories should always be last
UPDATE categories SET display_order = 999 WHERE is_custom = true;

-- Add index for efficient ordering
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON categories(display_order);