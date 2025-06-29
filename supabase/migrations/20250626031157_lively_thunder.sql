/*
  # Add Supabase UUID column for storage compatibility

  1. Schema Changes
    - Add `supabase_uuid` column to `user_profiles` table with UUID type and default value
    - This UUID will be used for Supabase Storage operations while keeping the existing Clerk user_id

  2. Data Migration
    - Generate UUIDs for existing users
    - Ensure all existing profiles have a supabase_uuid

  3. Security
    - No changes to RLS policies needed as they use user_id (Clerk ID)
    - The supabase_uuid is for internal Supabase Storage operations only
*/

-- Add supabase_uuid column to user_profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'supabase_uuid'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN supabase_uuid uuid DEFAULT gen_random_uuid() NOT NULL;
    
    -- Create index for performance
    CREATE INDEX IF NOT EXISTS idx_user_profiles_supabase_uuid ON user_profiles(supabase_uuid);
    
    -- Make supabase_uuid unique
    ALTER TABLE user_profiles ADD CONSTRAINT unique_supabase_uuid UNIQUE (supabase_uuid);
    
    -- Update existing records to have UUIDs (if any exist)
    UPDATE user_profiles SET supabase_uuid = gen_random_uuid() WHERE supabase_uuid IS NULL;
  END IF;
END $$;