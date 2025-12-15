-- Fix missing GRANT permissions for household_inventory table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.household_inventory TO authenticated;