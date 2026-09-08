-- Redesign chart of accounts: account_types (with nature) + accounts.type_id
-- Keeps system_key accounts for auto-posting.

-- ---------------------------------------------------------------------------
-- account_types
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.account_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  nature text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT account_types_name_check CHECK (length(btrim(name)) > 0),
  CONSTRAINT account_types_nature_check CHECK (
    nature IN ('asset', 'liability', 'equity', 'revenue', 'expense')
  ),
  CONSTRAINT account_types_name_unique UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS account_types_sort_order_idx
  ON public.account_types (sort_order, name);

CREATE INDEX IF NOT EXISTS account_types_nature_idx
  ON public.account_types (nature);

ALTER TABLE public.account_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_access_account_types" ON public.account_types;
CREATE POLICY "admin_full_access_account_types"
  ON public.account_types FOR ALL TO authenticated
  USING (public.get_auth_role() = 'admin')
  WITH CHECK (public.get_auth_role() = 'admin');

DROP POLICY IF EXISTS "cashier_select_account_types" ON public.account_types;
CREATE POLICY "cashier_select_account_types"
  ON public.account_types FOR SELECT TO authenticated
  USING (public.get_auth_role() IN ('admin', 'cashier'));

-- Seed default types (idempotent by name)
INSERT INTO public.account_types (name, nature, sort_order)
SELECT v.name, v.nature, v.sort_order
FROM (
  VALUES
    ('أصول', 'asset', 10),
    ('خصوم', 'liability', 20),
    ('حقوق ملكية', 'equity', 30),
    ('إيرادات', 'revenue', 40),
    ('مصروفات', 'expense', 50)
) AS v(name, nature, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM public.account_types t WHERE t.name = v.name
);

-- ---------------------------------------------------------------------------
-- accounts: add type_id, migrate, drop legacy type/parent_id
-- ---------------------------------------------------------------------------
ALTER TABLE public.accounts
  ADD COLUMN IF NOT EXISTS type_id uuid REFERENCES public.account_types (id) ON DELETE RESTRICT;

-- Map legacy accounts.type → account_types by nature (only if column still exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'accounts'
      AND column_name = 'type'
  ) THEN
    UPDATE public.accounts a
    SET type_id = t.id
    FROM public.account_types t
    WHERE a.type_id IS NULL
      AND a.type IS NOT NULL
      AND t.nature = a.type;
  END IF;
END $$;

-- Fallback: any remaining rows → أصول
UPDATE public.accounts
SET type_id = (SELECT id FROM public.account_types WHERE nature = 'asset' ORDER BY sort_order LIMIT 1)
WHERE type_id IS NULL;

-- Only enforce NOT NULL when every row has type_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.accounts WHERE type_id IS NULL) THEN
    RAISE EXCEPTION 'تعذر تعيين type_id لكل الحسابات — أضف أنواعاً ثم أعد التشغيل';
  END IF;

  ALTER TABLE public.accounts
    ALTER COLUMN type_id SET NOT NULL;
END $$;

CREATE INDEX IF NOT EXISTS accounts_type_id_idx ON public.accounts (type_id);

-- Drop legacy hierarchy / enum type column (safe if already dropped)
ALTER TABLE public.accounts DROP CONSTRAINT IF EXISTS accounts_type_check;
DROP INDEX IF EXISTS public.accounts_type_idx;
DROP INDEX IF EXISTS public.accounts_parent_id_idx;

ALTER TABLE public.accounts DROP COLUMN IF EXISTS parent_id;
ALTER TABLE public.accounts DROP COLUMN IF EXISTS type;

-- Ensure required system accounts exist (postable)
INSERT INTO public.accounts (code, name, type_id, is_postable, is_active, system_key)
SELECT v.code, v.name, t.id, true, true, v.system_key
FROM (
  VALUES
    ('1101', 'الصندوق', 'cash', 'asset'),
    ('1102', 'البنك', 'bank', 'asset'),
    ('1201', 'ذمم العملاء', 'ar', 'asset'),
    ('1301', 'المخزون', 'inventory', 'asset'),
    ('2101', 'ذمم الموردين', 'ap', 'liability'),
    ('4101', 'المبيعات', 'sales', 'revenue'),
    ('5101', 'تكلفة المبيعات', 'cogs', 'expense'),
    ('3301', 'أرباح مرحلة', 'retained_earnings', 'equity')
) AS v(code, name, system_key, nature)
JOIN public.account_types t ON t.nature = v.nature
WHERE NOT EXISTS (
  SELECT 1 FROM public.accounts a WHERE a.system_key = v.system_key
)
AND NOT EXISTS (
  SELECT 1 FROM public.accounts a WHERE a.code = v.code
);

-- If code exists but system_key missing, attach system_key when free
UPDATE public.accounts a
SET system_key = v.system_key,
    is_postable = true,
    is_active = true
FROM (
  VALUES
    ('1101', 'cash'),
    ('1102', 'bank'),
    ('1201', 'ar'),
    ('1301', 'inventory'),
    ('2101', 'ap'),
    ('4101', 'sales'),
    ('5101', 'cogs'),
    ('3301', 'retained_earnings')
) AS v(code, system_key)
WHERE a.code = v.code
  AND a.system_key IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.accounts x WHERE x.system_key = v.system_key
  );

-- ---------------------------------------------------------------------------
-- Remove accounts not required for sale/purchase (+ period close)
-- Keep: cash, bank, ar, ap, inventory, sales, cogs, retained_earnings
-- In-use rows (journal / operating expenses) are deactivated, not deleted.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_keep text[] := ARRAY[
    'cash',
    'bank',
    'ar',
    'ap',
    'inventory',
    'sales',
    'cogs',
    'retained_earnings'
  ];
  v_has_operating_expenses boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'operating_expenses'
  ) INTO v_has_operating_expenses;

  UPDATE public.accounts a
  SET is_active = false
  WHERE (
      a.system_key IS NULL
      OR a.system_key <> ALL (v_keep)
    )
    AND a.is_active = true
    AND (
      EXISTS (
        SELECT 1 FROM public.journal_lines jl WHERE jl.account_id = a.id
      )
      OR (
        v_has_operating_expenses
        AND EXISTS (
          SELECT 1
          FROM public.operating_expenses oe
          WHERE oe.account_id = a.id
        )
      )
    );

  DELETE FROM public.accounts a
  WHERE (
      a.system_key IS NULL
      OR a.system_key <> ALL (v_keep)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.journal_lines jl WHERE jl.account_id = a.id
    )
    AND (
      NOT v_has_operating_expenses
      OR NOT EXISTS (
        SELECT 1
        FROM public.operating_expenses oe
        WHERE oe.account_id = a.id
      )
    );

  UPDATE public.accounts
  SET is_active = true,
      is_postable = true
  WHERE system_key = ANY (v_keep);
END $$;

-- ---------------------------------------------------------------------------
-- Patch record_operating_expense to use account_types.nature
-- ---------------------------------------------------------------------------
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
  v_nature text;
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

  SELECT t.nature INTO v_nature
  FROM public.account_types t
  WHERE t.id = v_account.type_id;

  IF v_nature IS DISTINCT FROM 'expense'
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

-- ---------------------------------------------------------------------------
-- Patch close_accounting_period to use account_types.nature
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.close_accounting_period(
  p_year integer,
  p_month integer,
  p_memo text DEFAULT ''
)
RETURNS public.accounting_periods
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period public.accounting_periods;
  v_start date;
  v_end date;
  v_acc record;
  v_alayh numeric(12, 2);
  v_lahu numeric(12, 2);
  v_rev_credit numeric(12, 2);
  v_exp_debit numeric(12, 2);
  v_lines jsonb := '[]'::jsonb;
  v_line_count integer := 0;
  v_net numeric(12, 2);
  v_entry_id uuid;
  v_memo text;
  v_close_date date;
BEGIN
  PERFORM public.assert_admin();

  IF p_year IS NULL OR p_month IS NULL OR p_month < 1 OR p_month > 12 THEN
    RAISE EXCEPTION 'شهر/سنة غير صالحين';
  END IF;

  INSERT INTO public.accounting_periods (period_year, period_month, status)
  VALUES (p_year, p_month, 'open')
  ON CONFLICT (period_year, period_month) DO NOTHING;

  SELECT * INTO v_period
  FROM public.accounting_periods
  WHERE period_year = p_year AND period_month = p_month
  FOR UPDATE;

  IF v_period.status IS DISTINCT FROM 'open' THEN
    RAISE EXCEPTION 'الفترة مقفلة مسبقاً';
  END IF;

  v_start := make_date(p_year, p_month, 1);
  v_end := (v_start + interval '1 month' - interval '1 day')::date;
  v_close_date := v_end;

  FOR v_acc IN
    SELECT a.id, t.nature, a.code, a.name
    FROM public.accounts a
    INNER JOIN public.account_types t ON t.id = a.type_id
    WHERE a.is_postable = true
      AND t.nature IN ('revenue', 'expense')
    ORDER BY a.code
  LOOP
    SELECT
      COALESCE(SUM(jl.amount_alayh), 0),
      COALESCE(SUM(jl.amount_lahu), 0)
    INTO v_alayh, v_lahu
    FROM public.journal_lines jl
    INNER JOIN public.journal_entries je ON je.id = jl.entry_id
    WHERE jl.account_id = v_acc.id
      AND je.status = 'posted'
      AND je.entry_date >= v_start
      AND je.entry_date <= v_end
      AND je.source_type IS DISTINCT FROM 'period_close';

    IF v_acc.nature = 'revenue' THEN
      v_rev_credit := round(v_lahu - v_alayh, 2);
      IF v_rev_credit > 0 THEN
        v_lines := v_lines || jsonb_build_array(
          jsonb_build_object(
            'account_id', v_acc.id::text,
            'alayh', v_rev_credit,
            'lahu', 0,
            'memo', 'إقفال إيراد'
          )
        );
        v_line_count := v_line_count + 1;
      ELSIF v_rev_credit < 0 THEN
        v_lines := v_lines || jsonb_build_array(
          jsonb_build_object(
            'account_id', v_acc.id::text,
            'alayh', 0,
            'lahu', abs(v_rev_credit),
            'memo', 'إقفال إيراد'
          )
        );
        v_line_count := v_line_count + 1;
      END IF;
    ELSE
      v_exp_debit := round(v_alayh - v_lahu, 2);
      IF v_exp_debit > 0 THEN
        v_lines := v_lines || jsonb_build_array(
          jsonb_build_object(
            'account_id', v_acc.id::text,
            'alayh', 0,
            'lahu', v_exp_debit,
            'memo', 'إقفال مصروف'
          )
        );
        v_line_count := v_line_count + 1;
      ELSIF v_exp_debit < 0 THEN
        v_lines := v_lines || jsonb_build_array(
          jsonb_build_object(
            'account_id', v_acc.id::text,
            'alayh', abs(v_exp_debit),
            'lahu', 0,
            'memo', 'إقفال مصروف'
          )
        );
        v_line_count := v_line_count + 1;
      END IF;
    END IF;
  END LOOP;

  v_entry_id := NULL;

  IF v_line_count > 0 THEN
    SELECT
      COALESCE(SUM((x ->> 'alayh')::numeric), 0),
      COALESCE(SUM((x ->> 'lahu')::numeric), 0)
    INTO v_alayh, v_lahu
    FROM jsonb_array_elements(v_lines) AS t(x);

    v_net := round(v_alayh - v_lahu, 2);
    IF v_net > 0 THEN
      v_lines := v_lines || jsonb_build_array(
        jsonb_build_object(
          'system_key', 'retained_earnings',
          'alayh', 0,
          'lahu', v_net,
          'memo', 'صافي دخل الفترة'
        )
      );
    ELSIF v_net < 0 THEN
      v_lines := v_lines || jsonb_build_array(
        jsonb_build_object(
          'system_key', 'retained_earnings',
          'alayh', abs(v_net),
          'lahu', 0,
          'memo', 'صافي خسارة الفترة'
        )
      );
    END IF;

    IF jsonb_array_length(v_lines) < 2 THEN
      RAISE EXCEPTION 'تعذر بناء قيد إقفال متوازن';
    END IF;

    v_memo := COALESCE(
      NULLIF(btrim(p_memo), ''),
      'إقفال فترة ' || p_year::text || '/' || lpad(p_month::text, 2, '0')
    );

    v_entry_id := public.post_journal_entry(
      v_close_date,
      v_memo,
      'period_close',
      v_period.id,
      v_lines,
      auth.uid()
    );
  END IF;

  UPDATE public.accounting_periods
  SET
    status = 'closed',
    closed_by = auth.uid(),
    closed_at = timezone('utc', now()),
    closing_entry_id = v_entry_id,
    close_memo = COALESCE(NULLIF(btrim(p_memo), ''), close_memo)
  WHERE id = v_period.id
  RETURNING * INTO v_period;

  RETURN v_period;
END;
$$;

REVOKE ALL ON FUNCTION public.close_accounting_period(integer, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.close_accounting_period(integer, integer, text) TO authenticated;
