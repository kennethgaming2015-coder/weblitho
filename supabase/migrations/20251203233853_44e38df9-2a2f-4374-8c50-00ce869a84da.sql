-- Fix search_path for calculate_credit_cost function
CREATE OR REPLACE FUNCTION public.calculate_credit_cost(output_length INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF output_length < 2000 THEN
    RETURN 1;
  ELSIF output_length < 5000 THEN
    RETURN 2;
  ELSIF output_length < 10000 THEN
    RETURN 3;
  ELSE
    RETURN 5;
  END IF;
END;
$$;