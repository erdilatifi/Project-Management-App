-- Migration: Add email column to profiles table
-- This replaces the auth_users_public view with a direct email column in profiles

-- Add email column if it doesn't exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email text;

-- Create index for faster email searches
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- Add comment
COMMENT ON COLUMN profiles.email IS 'User email address, replaces auth_users_public view';

-- Optional: Populate email from auth.users for existing profiles
-- This should be run as a one-time migration
DO $$
DECLARE
    user_record RECORD;
BEGIN
    FOR user_record IN 
        SELECT au.id, au.email 
        FROM auth.users au
        WHERE NOT EXISTS (
            SELECT 1 FROM profiles p WHERE p.id = au.id AND p.email IS NOT NULL
        )
    LOOP
        UPDATE profiles 
        SET email = user_record.email 
        WHERE id = user_record.id AND email IS NULL;
    END LOOP;
END $$;

