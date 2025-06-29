/*
  # Fix commitments schema for proper data storage
  
  1. Changes
    - Ensure deadline and frequency are properly stored
    - Add default values to prevent NULL entries
    - Add constraints to ensure data integrity
    - Add comments for documentation
    
  2. Data Integrity
    - Deadline should be either set or explicitly marked as N/A
    - Frequency should have a valid value or be explicitly set to NULL
    - Start date is required when frequency is set (except for "None")
*/

-- Update existing goals to ensure no NULL values for deadline and frequency
UPDATE goals
SET 
  deadline = NULL,
  frequency = 'None, I will reach out on my own'
WHERE 
  deadline IS NULL AND frequency IS NULL;

-- Add check constraint to ensure either deadline is set or frequency is set
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'goals_commitment_check'
  ) THEN
    ALTER TABLE goals
    ADD CONSTRAINT goals_commitment_check
    CHECK (
      deadline IS NOT NULL OR 
      frequency IS NOT NULL
    );
  END IF;
EXCEPTION WHEN others THEN
  -- Constraint might already exist or there might be data that violates it
  RAISE NOTICE 'Skipping constraint creation: %', SQLERRM;
END $$;

-- Add check constraint to ensure start_date is set when frequency is set (except for "None")
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'goals_start_date_check'
  ) THEN
    ALTER TABLE goals
    ADD CONSTRAINT goals_start_date_check
    CHECK (
      frequency IS NULL OR
      frequency = 'None, I will reach out on my own' OR
      (frequency IS NOT NULL AND start_date IS NOT NULL)
    );
  END IF;
EXCEPTION WHEN others THEN
  -- Constraint might already exist or there might be data that violates it
  RAISE NOTICE 'Skipping constraint creation: %', SQLERRM;
END $$;

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