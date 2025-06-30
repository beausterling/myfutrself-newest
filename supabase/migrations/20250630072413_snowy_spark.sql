/*
  # Drop goals commitment check constraint

  1. Changes
    - Remove the constraint that requires goals to have either a deadline or frequency
    - This allows goals to be created during onboarding without immediate commitment details
    - Commitments will be added later in the onboarding flow on the commitments page

  2. Rationale
    - The constraint was preventing goal creation during the user-goals onboarding step
    - Goals should be allowed to exist without commitments initially
    - Commitments are set in a separate step of the onboarding process
*/

-- Drop the constraint that requires goals to have either deadline or frequency
ALTER TABLE public.goals DROP CONSTRAINT IF EXISTS goals_commitment_check;