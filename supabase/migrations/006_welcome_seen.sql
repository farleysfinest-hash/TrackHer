-- Welcome message seen flag (account-level)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS welcome_seen BOOLEAN DEFAULT FALSE;

