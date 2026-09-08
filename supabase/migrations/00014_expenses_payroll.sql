-- Phase 3 placeholder: operating expenses module removed.
-- assert_admin is required by later migrations (period close/reopen).

CREATE OR REPLACE FUNCTION public.assert_admin()
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;
  IF public.get_auth_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'هذه العملية متاحة للمدير فقط';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assert_admin() TO authenticated;
