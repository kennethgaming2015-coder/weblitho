-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Add billing fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS billing_name TEXT,
ADD COLUMN IF NOT EXISTS billing_email TEXT,
ADD COLUMN IF NOT EXISTS billing_address TEXT,
ADD COLUMN IF NOT EXISTS billing_city TEXT,
ADD COLUMN IF NOT EXISTS billing_country TEXT,
ADD COLUMN IF NOT EXISTS billing_postal_code TEXT,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;

-- Function to reset daily credits
CREATE OR REPLACE FUNCTION public.reset_daily_credits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.user_credits
  SET 
    credits_balance = CASE 
      WHEN plan = 'free' THEN LEAST(credits_balance + 5, 5)
      WHEN plan = 'pro' THEN LEAST(credits_balance + 20, monthly_credits)
      WHEN plan = 'business' THEN LEAST(credits_balance + 50, monthly_credits)
    END,
    last_daily_reset = now(),
    updated_at = now()
  WHERE last_daily_reset < now() - interval '24 hours';
END;
$$;