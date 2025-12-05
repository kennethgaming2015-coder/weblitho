-- Alter credit_transactions amount column to accept decimals
ALTER TABLE public.credit_transactions 
ALTER COLUMN amount TYPE numeric(10,2) USING amount::numeric(10,2);