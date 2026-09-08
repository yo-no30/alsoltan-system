-- Operating expenses: table + admin RPC (posts journal + stores row)

CREATE TABLE IF NOT EXISTS public.operating_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_date date NOT NULL DEFAULT (timezone('utc', now()))::date,
  account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  pay_from text NOT NULL,
  memo text NOT NULL DEFAULT '',
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  journal_entry_id uuid REFERENCES public.journal_entries (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT operating_expenses_pay_from_check CHECK (pay_from IN ('cash', 'bank'))
);

CREATE INDEX IF NOT EXISTS operating_expenses_expense_date_idx
  ON public.operating_expenses (expense_date DESC);

CREATE INDEX IF NOT EXISTS operating_expenses_account_id_idx
  ON public.operating_expenses (account_id);

CREATE INDEX IF NOT EXISTS operating_expenses_pay_from_idx
  ON public.operating_expenses (pay_from);

ALTER TABLE public.operating_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_access_operating_expenses" ON public.operating_expenses;
CREATE POLICY "admin_full_access_operating_expenses"
  ON public.operating_expenses FOR ALL TO authenticated
  USING (public.get_auth_role() = 'admin')
  WITH CHECK (public.get_auth_role() = 'admin');

CREATE OR REPLACE FUNCTION public.record_operating_expense(
  p_expense_date date,
  p_account_id uuid,
  p_amount numeric,
  p_pay_from text,
  p_memo text DEFAULT ''
)
RETURNS public.operating_expenses
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_account public.accounts;
  v_amount numeric(12, 2);
  v_memo text;
  v_pay_key text;
  v_entry_id uuid;
  v_row public.operating_expenses;
BEGIN
  PERFORM public.assert_admin();

  IF p_pay_from IS NULL OR p_pay_from NOT IN ('cash', 'bank') THEN
    RAISE EXCEPTION 'مصدر الدفع يجب أن يكون صندوق أو بنك';
  END IF;

  v_amount := round(COALESCE(p_amount, 0), 2);
  IF v_amount <= 0 THEN
    RAISE EXCEPTION 'مبلغ المصروف يجب أن يكون أكبر من صفر';
  END IF;

  SELECT * INTO v_account FROM public.accounts WHERE id = p_account_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'حساب المصروف غير موجود';
  END IF;

  IF v_account.type IS DISTINCT FROM 'expense'
     OR v_account.is_postable IS NOT TRUE
     OR v_account.is_active IS NOT TRUE THEN
    RAISE EXCEPTION 'يجب اختيار حساب مصروف تشغيلي نشط قابل للترحيل';
  END IF;

  IF v_account.system_key = 'cogs' THEN
    RAISE EXCEPTION 'لا يمكن تسجيل مصروف تشغيلي على تكلفة المبيعات';
  END IF;

  v_pay_key := p_pay_from;
  v_memo := COALESCE(NULLIF(btrim(p_memo), ''), 'مصروف تشغيلي');

  v_entry_id := public.post_journal_entry(
    COALESCE(p_expense_date, (timezone('utc', now()))::date),
    v_memo,
    'expense',
    NULL,
    jsonb_build_array(
      jsonb_build_object('account_id', p_account_id::text, 'alayh', v_amount, 'lahu', 0),
      jsonb_build_object('system_key', v_pay_key, 'alayh', 0, 'lahu', v_amount)
    ),
    auth.uid()
  );

  INSERT INTO public.operating_expenses (
    expense_date,
    account_id,
    amount,
    pay_from,
    memo,
    created_by,
    journal_entry_id
  )
  VALUES (
    COALESCE(p_expense_date, (timezone('utc', now()))::date),
    p_account_id,
    v_amount,
    p_pay_from,
    v_memo,
    auth.uid(),
    v_entry_id
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.record_operating_expense(date, uuid, numeric, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_operating_expense(date, uuid, numeric, text, text) TO authenticated;
