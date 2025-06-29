/*
  # Fix goals table constraints for commitments

  1. Changes
    - Update goals_commitment_check constraint to properly handle "None" frequency
    - Ensure frequency is stored as text rather than NULL for "None" option
    - Fix existing data to ensure constraint compliance
    
  2. Data Integrity
    - Ensure all goals have either a deadline or a frequency value
    - Update existing NULL values to use "None, I will reach out on my own"
    - Maintain proper relationship between frequency and start_date
*/

-- First, update any existing goals with NULL frequency to use the "None" option
UPDATE goals
SET frequency = 'None, I will reach out on my own'
WHERE frequency IS NULL AND deadline IS NULL;

-- Drop existing constraint if it exists
ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_commitment_check;

-- Add updated constraint to ensure either deadline or frequency is set
ALTER TABLE goals
ADD CONSTRAINT goals_commitment_check
CHECK (
  deadline IS NOT NULL OR frequency IS NOT NULL
);

-- Drop existing start_date constraint if it exists
ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_start_date_check;

-- Add constraint to ensure start_date is set when frequency is set (except for "None")
ALTER TABLE goals
ADD CONSTRAINT goals_start_date_check
CHECK (
  frequency IS NULL OR
  frequency = 'None, I will reach out on my own' OR
  (frequency IS NOT NULL AND start_date IS NOT NULL)
);

-- Update existing goals to set start_date for those with frequency but no start_date
UPDATE goals
SET start_date = CURRENT_DATE
WHERE 
  frequency IS NOT NULL AND
  frequency != 'None, I will reach out on my own' AND
  start_date IS NULL;

-- Add comments to document the columns
COMMENT ON COLUMN goals.deadline IS 'Target deadline for achieving this goal (optional if frequency is set)';
COMMENT ON COLUMN goals.frequency IS 'Check-in frequency for this goal (optional if deadline is set)';
COMMENT ON COLUMN goals.start_date IS 'Start date for goal check-in routine (required when frequency is set, except for "None")';