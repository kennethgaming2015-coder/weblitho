-- Change credits_balance to numeric to support decimal values
ALTER TABLE public.user_credits 
ALTER COLUMN credits_balance TYPE NUMERIC(10,2),
ALTER COLUMN monthly_credits TYPE NUMERIC(10,2),
ALTER COLUMN daily_credits TYPE NUMERIC(10,2);

-- Update function to handle decimals
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