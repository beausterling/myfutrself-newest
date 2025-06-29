/*
  # Add goals column to waitlist table

  1. Changes
    - Add `goals` column to the waitlist table
    - Column is optional (nullable) to maintain backward compatibility
    - Add index for potential future analytics on goals data

  2. Security
    - Maintains existing RLS policies
    - No changes to access control
*/

-- Add goals column to waitlist table
ALTER TABLE waitlist 
ADD COLUMN IF NOT EXISTS goals text;

-- Add index for goals column for potential analytics
CREATE INDEX IF NOT EXISTS idx_waitlist_goals ON waitlist(goals) WHERE goals IS NOT NULL;