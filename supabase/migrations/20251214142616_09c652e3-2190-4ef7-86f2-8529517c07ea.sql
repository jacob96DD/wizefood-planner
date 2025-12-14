-- Opret cleanup funktion til at rydde gamle tilbud
CREATE OR REPLACE FUNCTION public.cleanup_old_offers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Marker tilbud som inaktive når de er udløbet
  UPDATE offers 
  SET is_active = false 
  WHERE valid_until < CURRENT_DATE 
    AND is_active = true;
  
  -- Slet tilbud der udløb for mere end 7 dage siden
  DELETE FROM offers 
  WHERE valid_until < CURRENT_DATE - INTERVAL '7 days';
END;
$$;