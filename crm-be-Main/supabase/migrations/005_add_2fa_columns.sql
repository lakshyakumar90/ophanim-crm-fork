-- Add 2FA columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS two_factor_secret TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_2fa_enabled BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN public.users.two_factor_secret IS 'TOTP secret for 2FA authentication';
COMMENT ON COLUMN public.users.is_2fa_enabled IS 'Whether 2FA is enabled for the user';
