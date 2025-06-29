/*
  # Add start_date column to goals table

  1. Changes
    - Add `start_date` column to `goals` table as DATE type
    - Add index for efficient querying of goals with start dates
    - Add comment for documentation

  2. Purpose
    - Store the start date for goal check-in routines
    - Only used when frequency is set (not for "None, I will reach out on my own")
*/

-- Add start_date column to goals table
ALTER TABLE goals 
ADD COLUMN IF NOT EXISTS start_date date;

-- Add index for efficient querying of goals with start dates
CREATE INDEX IF NOT EXISTS idx_goals_start_date 
ON goals (start_date) 
WHERE start_date IS NOT NULL;

-- Add comment to document the column purpose
COMMENT ON COLUMN goals.start_date IS 'Start date for goal check-in routine (only when frequency is set)';