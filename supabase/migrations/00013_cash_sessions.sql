-- Cash helper: transfer cash → bank only.
-- (Petty expense / expenses module removed.)

-- ---------------------------------------------------------------------------
-- transfer_cash_to_bank
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transfer_cash_to_bank(
  p_amount numeric,
  p_memo text DEFAULT ''
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_amount numeric(12, 2);
  v_memo text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;

  v_role := public.get_auth_role();
  IF v_role IS NULL OR v_role NOT IN ('admin', 'cashier') THEN
    RAISE EXCEPTION 'ليست لديك صلاحية لتحويل الصندوق إلى البنك';
  END IF;

  v_amount := round(COALESCE(p_amount, 0), 2);
  IF v_amount <= 0 THEN
    RAISE EXCEPTION 'مبلغ التحويل يجب أن يكون أكبر من صفر';
  END IF;

  v_memo := COALESCE(NULLIF(btrim(p_memo), ''), 'تحويل من الصندوق إلى البنك');

  RETURN public.post_journal_entry(
    (timezone('utc', now()))::date,
    v_memo,
    'cash_transfer',
    NULL,
    jsonb_build_array(
      jsonb_build_object('system_key', 'bank', 'alayh', v_amount, 'lahu', 0),
      jsonb_build_object('system_key', 'cash', 'alayh', 0, 'lahu', v_amount)
    ),
    auth.uid()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.transfer_cash_to_bank(numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.transfer_cash_to_bank(numeric, text) TO authenticated;
