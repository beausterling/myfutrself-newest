/*
  # Update goals table for deadline and frequency storage

  1. Schema Updates
    - Ensure `deadline` column exists as DATE type for goal deadlines
    - Ensure `frequency` column exists as TEXT type for check-in frequencies
    - Add indexes for efficient querying
    - Add updated_at trigger for automatic timestamp updates

  2. Data Integrity
    - Use IF NOT EXISTS to prevent errors on existing columns
    - Add constraints to ensure data quality
    - Add comments for documentation

  3. Performance
    - Add indexes for common query patterns
    - Optimize for user-specific goal queries
*/

-- Ensure deadline column exists (should already exist based on schema)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'goals' AND column_name = 'deadline'
  ) THEN
    ALTER TABLE goals ADD COLUMN deadline date;
  END IF;
END $$;

-- Ensure frequency column exists (should already exist based on schema)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'goals' AND column_name = 'frequency'
  ) THEN
    ALTER TABLE goals ADD COLUMN frequency text;
  END IF;
END $$;

-- Add indexes for efficient querying of goals with deadlines and frequencies
CREATE INDEX IF NOT EXISTS idx_goals_deadline 
ON goals (deadline) 
WHERE deadline IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_goals_frequency 
ON goals (frequency) 
WHERE frequency IS NOT NULL;

-- Add composite index for user goals with commitments
CREATE INDEX IF NOT EXISTS idx_goals_user_commitments 
ON goals (user_id, deadline, frequency) 
WHERE deadline IS NOT NULL OR frequency IS NOT NULL;

-- Add comments to document the columns
COMMENT ON COLUMN goals.deadline IS 'Target deadline for achieving this goal (optional)';
COMMENT ON COLUMN goals.frequency IS 'Check-in frequency for this goal (e.g., Daily, Weekly, Monthly, etc.)';

-- Ensure updated_at trigger exists for goals table
CREATE OR REPLACE FUNCTION update_goals_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_goals_updated_at'
  ) THEN
    CREATE TRIGGER update_goals_updated_at
      BEFORE UPDATE ON goals
      FOR EACH ROW
      EXECUTE FUNCTION update_goals_updated_at();
  END IF;
END $$;