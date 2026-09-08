-- Phase 4: accounting periods, period close to retained earnings, gate posting

-- ---------------------------------------------------------------------------
-- Extend journal source_type
-- ---------------------------------------------------------------------------
ALTER TABLE public.journal_entries
  DROP CONSTRAINT journal_entries_source_type_check;

ALTER TABLE public.journal_entries
  ADD CONSTRAINT journal_entries_source_type_check CHECK (
    source_type IN (
      'sale',
      'purchase',
      'customer_payment',
      'supplier_payment',
      'expense',
      'payroll',
      'cash_transfer',
      'manual',
      'adjustment',
      'period_close'
    )
  );

-- ---------------------------------------------------------------------------
-- accounting_periods
-- ---------------------------------------------------------------------------
CREATE TABLE public.accounting_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_year integer NOT NULL CHECK (period_year >= 2000 AND period_year <= 2100),
  period_month integer NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
  status text NOT NULL DEFAULT 'open',
  closed_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  closed_at timestamptz,
  reopened_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  reopened_at timestamptz,
  closing_entry_id uuid REFERENCES public.journal_entries (id) ON DELETE SET NULL,
  close_memo text NOT NULL DEFAULT '',
  reopen_memo text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT accounting_periods_status_check CHECK (status IN ('open', 'closed')),
  CONSTRAINT accounting_periods_year_month_unique UNIQUE (period_year, period_month)
);

CREATE INDEX accounting_periods_status_idx ON public.accounting_periods (status);
CREATE INDEX accounting_periods_year_month_idx
  ON public.accounting_periods (period_year DESC, period_month DESC);

-- ---------------------------------------------------------------------------
-- ensure_period_open: create month if missing; reject if closed
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_period_open(p_date date)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year integer;
  v_month integer;
  v_id uuid;
  v_status text;
BEGIN
  IF p_date IS NULL THEN
    p_date := (timezone('utc', now()))::date;
  END IF;

  v_year := EXTRACT(YEAR FROM p_date)::integer;
  v_month := EXTRACT(MONTH FROM p_date)::integer;

  SELECT id, status INTO v_id, v_status
  FROM public.accounting_periods
  WHERE period_year = v_year AND period_month = v_month;

  IF NOT FOUND THEN
    INSERT INTO public.accounting_periods (period_year, period_month, status)
    VALUES (v_year, v_month, 'open')
    RETURNING id INTO v_id;
    RETURN v_id;
  END IF;

  IF v_status = 'closed' THEN
    RAISE EXCEPTION 'الفترة المحاسبية %/% مقفلة — لا يمكن ترحيل قيود عليها',
      v_year, lpad(v_month::text, 2, '0');
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_period_open(date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_period_open(date) TO authenticated;

-- ---------------------------------------------------------------------------
-- post_journal_entry: gate on open period (period_close allowed while still open)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_journal_entry(
  p_entry_date date,
  p_memo text,
  p_source_type text,
  p_source_id uuid,
  p_lines jsonb,
  p_created_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_entry_id uuid;
  v_line jsonb;
  v_account_id uuid;
  v_alayh numeric(12, 2);
  v_lahu numeric(12, 2);
  v_key text;
  v_created_by uuid;
  v_date date;
BEGIN
  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) < 2 THEN
    RAISE EXCEPTION 'القيد يحتاج سطرين على الأقل';
  END IF;

  v_date := COALESCE(p_entry_date, (timezone('utc', now()))::date);
  PERFORM public.ensure_period_open(v_date);

  v_created_by := COALESCE(p_created_by, auth.uid());

  IF p_source_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.journal_entries
      WHERE source_type = p_source_type
        AND source_id = p_source_id
        AND status = 'posted'
    ) THEN
      RAISE EXCEPTION 'يوجد قيد مرحّل مسبقاً لنفس العملية';
    END IF;
  END IF;

  INSERT INTO public.journal_entries (
    entry_date,
    memo,
    source_type,
    source_id,
    created_by,
    status
  )
  VALUES (
    v_date,
    COALESCE(p_memo, ''),
    p_source_type,
    p_source_id,
    v_created_by,
    'posted'
  )
  RETURNING id INTO v_entry_id;

  FOR v_line IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    v_key := NULLIF(btrim(COALESCE(v_line ->> 'system_key', '')), '');
    IF v_line ? 'account_id' AND NULLIF(v_line ->> 'account_id', '') IS NOT NULL THEN
      v_account_id := (v_line ->> 'account_id')::uuid;
    ELSIF v_key IS NOT NULL THEN
      v_account_id := public.account_id_by_system_key(v_key);
    ELSE
      RAISE EXCEPTION 'كل سطر قيد يحتاج حساباً';
    END IF;

    IF v_account_id IS NULL THEN
      RAISE EXCEPTION 'الحساب غير موجود: %', COALESCE(v_key, v_line ->> 'account_id');
    END IF;

    v_alayh := round(COALESCE((v_line ->> 'alayh')::numeric, 0), 2);
    v_lahu := round(COALESCE((v_line ->> 'lahu')::numeric, 0), 2);

    IF v_alayh < 0 OR v_lahu < 0 THEN
      RAISE EXCEPTION 'مبالغ القيد يجب أن تكون صفر أو أكثر';
    END IF;

    IF (v_alayh = 0 AND v_lahu = 0) OR (v_alayh > 0 AND v_lahu > 0) THEN
      RAISE EXCEPTION 'كل سطر يجب أن يكون إما عليه أو له فقط';
    END IF;

    INSERT INTO public.journal_lines (
      entry_id,
      account_id,
      amount_alayh,
      amount_lahu,
      line_memo
    )
    VALUES (
      v_entry_id,
      v_account_id,
      v_alayh,
      v_lahu,
      COALESCE(v_line ->> 'memo', '')
    );
  END LOOP;

  PERFORM public.assert_balanced_entry(v_entry_id);
  RETURN v_entry_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- close_accounting_period
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

  -- Ensure period row exists
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

  -- Aggregate P&L accounts for posted entries in period (exclude void / prior period_close voided)
  FOR v_acc IN
    SELECT a.id, a.type, a.code, a.name
    FROM public.accounts a
    WHERE a.is_postable = true
      AND a.type IN ('revenue', 'expense')
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

    IF v_acc.type = 'revenue' THEN
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
    -- Plug retained earnings to balance
    SELECT
      COALESCE(SUM((x ->> 'alayh')::numeric), 0),
      COALESCE(SUM((x ->> 'lahu')::numeric), 0)
    INTO v_alayh, v_lahu
    FROM jsonb_array_elements(v_lines) AS t(x);

    v_net := round(v_alayh - v_lahu, 2);
    IF v_net > 0 THEN
      -- more alayh than lahu → need credit to RE (profit plug when revenues closed > expenses closed)
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

-- ---------------------------------------------------------------------------
-- reopen_accounting_period
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reopen_accounting_period(
  p_year integer,
  p_month integer,
  p_memo text
)
RETURNS public.accounting_periods
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period public.accounting_periods;
  v_memo text;
BEGIN
  PERFORM public.assert_admin();

  v_memo := btrim(COALESCE(p_memo, ''));
  IF v_memo = '' THEN
    RAISE EXCEPTION 'سبب إعادة الفتح إلزامي';
  END IF;

  SELECT * INTO v_period
  FROM public.accounting_periods
  WHERE period_year = p_year AND period_month = p_month
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'الفترة غير موجودة';
  END IF;

  IF v_period.status IS DISTINCT FROM 'closed' THEN
    RAISE EXCEPTION 'الفترة ليست مقفلة';
  END IF;

  IF v_period.closing_entry_id IS NOT NULL THEN
    UPDATE public.journal_entries
    SET status = 'void'
    WHERE id = v_period.closing_entry_id
      AND status = 'posted';
  END IF;

  UPDATE public.accounting_periods
  SET
    status = 'open',
    reopened_by = auth.uid(),
    reopened_at = timezone('utc', now()),
    reopen_memo = v_memo,
    closing_entry_id = NULL,
    closed_by = NULL,
    closed_at = NULL
  WHERE id = v_period.id
  RETURNING * INTO v_period;

  RETURN v_period;
END;
$$;

REVOKE ALL ON FUNCTION public.reopen_accounting_period(integer, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reopen_accounting_period(integer, integer, text) TO authenticated;

-- ---------------------------------------------------------------------------
-- Harden create_manual_journal_entry: require memo
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_manual_journal_entry(
  p_entry_date date,
  p_memo text,
  p_lines jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_memo text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'يجب تسجيل الدخول';
  END IF;

  IF public.get_auth_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'القيد اليدوي متاح للمدير فقط';
  END IF;

  v_memo := btrim(COALESCE(p_memo, ''));
  IF v_memo = '' THEN
    RAISE EXCEPTION 'بيان القيد اليدوي إلزامي';
  END IF;

  RETURN public.post_journal_entry(
    COALESCE(p_entry_date, (timezone('utc', now()))::date),
    v_memo,
    'manual',
    NULL,
    p_lines,
    auth.uid()
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.accounting_periods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_select_accounting_periods"
  ON public.accounting_periods
  FOR SELECT
  TO authenticated
  USING (public.get_auth_role() = 'admin');

-- Mutations via SECURITY DEFINER RPCs only
