/*
  # Add requesting_user_id function for RLS policies

  1. New Functions
    - `requesting_user_id()` - Extracts user ID from JWT for RLS policies
  
  2. Security
    - Function is SECURITY DEFINER to access JWT claims
    - Returns the user ID from the JWT 'sub' claim
    - Used in RLS policies to match rows to authenticated users

  This function replaces the need for custom JWT templates by working with Clerk's default JWT structure.
*/

-- Create function to get the requesting user's ID from JWT
CREATE OR REPLACE FUNCTION requesting_user_id()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub',
    (current_setting('request.jwt.claims', true)::json->>'user_id')
  );
$$;