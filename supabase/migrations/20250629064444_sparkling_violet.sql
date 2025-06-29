/*
  # Add start_date column to goals table
  
  1. Changes
    - Add start_date column to goals table for tracking when check-in routines should begin
    - Add index for efficient querying of goals with start dates
    - Add comment to document the column purpose
  
  2. Purpose
    - Support scheduling of check-in routines based on user-selected start dates
    - Enable filtering of goals by start date for notification systems
*/

-- Add start_date column to goals table if it doesn't exist
ALTER TABLE goals 
ADD COLUMN IF NOT EXISTS start_date date;

-- Add index for efficient querying of goals with start dates
CREATE INDEX IF NOT EXISTS idx_goals_start_date 
ON goals (start_date) 
WHERE start_date IS NOT NULL;

-- Add comment to document the column purpose
COMMENT ON COLUMN goals.start_date IS 'Start date for goal check-in routine (only when frequency is set)';