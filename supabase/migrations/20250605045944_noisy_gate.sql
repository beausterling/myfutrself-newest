/*
  # Add future photo storage
  
  1. Changes
    - Add column for storing the AI-generated aged photo URL
    - Add column for tracking when the future photo was last updated
*/

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS future_photo_url TEXT,
ADD COLUMN IF NOT EXISTS future_photo_updated_at TIMESTAMPTZ DEFAULT now();

-- Update the photo trigger to handle future photo updates
CREATE OR REPLACE FUNCTION update_photo_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.photo_url IS DISTINCT FROM NEW.photo_url THEN
    NEW.photo_updated_at = now();
  END IF;
  IF OLD.future_photo_url IS DISTINCT FROM NEW.future_photo_url THEN
    NEW.future_photo_updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;