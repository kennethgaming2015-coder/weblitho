-- Add unlimited flag and owner plan
ALTER TABLE public.user_credits 
ADD COLUMN IF NOT EXISTS is_unlimited BOOLEAN DEFAULT false;

-- Add 'owner' to the subscription plan enum
ALTER TYPE public.subscription_plan ADD VALUE IF NOT EXISTS 'owner';