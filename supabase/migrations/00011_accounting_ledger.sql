-- Accounting ledger foundation: chart of accounts + journal (له / عليه)
-- عليه = debit (amount_alayh), له = credit (amount_lahu)

-- ---------------------------------------------------------------------------
-- accounts
-- ---------------------------------------------------------------------------
CREATE TABLE public.accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL,
  name text NOT NULL,
  type text NOT NULL,
  parent_id uuid REFERENCES public.accounts (id) ON DELETE SET NULL,
  is_postable boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  system_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT accounts_code_unique UNIQUE (code),
  CONSTRAINT accounts_type_check CHECK (
    type IN ('asset', 'liability', 'equity', 'revenue', 'expense')
  ),
  CONSTRAINT accounts_system_key_unique UNIQUE (system_key)
);

CREATE INDEX accounts_type_idx ON public.accounts (type);
CREATE INDEX accounts_parent_id_idx ON public.accounts (parent_id);
CREATE INDEX accounts_is_active_idx ON public.accounts (is_active);

-- ---------------------------------------------------------------------------
-- journal_entries
-- ---------------------------------------------------------------------------
CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date date NOT NULL DEFAULT (timezone('utc', now()))::date,
  memo text NOT NULL DEFAULT '',
  source_type text NOT NULL,
  source_id uuid,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'posted',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT journal_entries_source_type_check CHECK (
    source_type IN (
      'sale',
      'purchase',
      'customer_payment',
      'supplier_payment',
      'expense',
      'payroll',
      'cash_transfer',
      'manual',
      'adjustment'
    )
  ),
  CONSTRAINT journal_entries_status_check CHECK (status IN ('posted', 'void'))
);

CREATE INDEX journal_entries_entry_date_idx ON public.journal_entries (entry_date DESC);
CREATE INDEX journal_entries_source_idx ON public.journal_entries (source_type, source_id);
CREATE INDEX journal_entries_created_by_idx ON public.journal_entries (created_by);

CREATE UNIQUE INDEX journal_entries_posted_source_unique
  ON public.journal_entries (source_type, source_id)
  WHERE status = 'posted' AND source_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- journal_lines
-- ---------------------------------------------------------------------------
CREATE TABLE public.journal_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id uuid NOT NULL REFERENCES public.journal_entries (id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts (id) ON DELETE RESTRICT,
  amount_alayh numeric(12, 2) NOT NULL DEFAULT 0,
  amount_lahu numeric(12, 2) NOT NULL DEFAULT 0,
  line_memo text NOT NULL DEFAULT '',
  CONSTRAINT journal_lines_amounts_non_negative CHECK (
    amount_alayh >= 0 AND amount_lahu >= 0
  ),
  CONSTRAINT journal_lines_one_side_check CHECK (
    (amount_alayh > 0 AND amount_lahu = 0)
    OR (amount_lahu > 0 AND amount_alayh = 0)
  )
);

CREATE INDEX journal_lines_entry_id_idx ON public.journal_lines (entry_id);
CREATE INDEX journal_lines_account_id_idx ON public.journal_lines (account_id);

-- ---------------------------------------------------------------------------
-- Seed chart of accounts (sale/purchase + period close only)
-- Extra expense/equity accounts are added later from the UI under account_types.
-- ---------------------------------------------------------------------------
INSERT INTO public.accounts (code, name, type, is_postable, system_key) VALUES
  ('1101', 'الصندوق', 'asset', true, 'cash'),
  ('1102', 'البنك', 'asset', true, 'bank'),
  ('1201', 'ذمم العملاء', 'asset', true, 'ar'),
  ('1301', 'المخزون', 'asset', true, 'inventory'),
  ('2101', 'ذمم الموردين', 'liability', true, 'ap'),
  ('3301', 'أرباح مرحلة', 'equity', true, 'retained_earnings'),
  ('4101', 'المبيعات', 'revenue', true, 'sales'),
  ('5101', 'تكلفة المبيعات', 'expense', true, 'cogs');

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.account_id_by_system_key(p_key text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
  FROM public.accounts
  WHERE system_key = p_key
    AND is_active = true
    AND is_postable = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.account_id_by_system_key(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.account_id_by_system_key(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.assert_balanced_entry(p_entry_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alayh numeric(12, 2);
  v_lahu numeric(12, 2);
BEGIN
  SELECT
    COALESCE(SUM(amount_alayh), 0),
    COALESCE(SUM(amount_lahu), 0)
  INTO v_alayh, v_lahu
  FROM public.journal_lines
  WHERE entry_id = p_entry_id;

  IF v_alayh <> v_lahu THEN
    RAISE EXCEPTION 'القيد غير متوازن: عليه % له %', v_alayh, v_lahu;
  END IF;

  IF v_alayh <= 0 THEN
    RAISE EXCEPTION 'القيد يجب أن يحتوي على مبالغ أكبر من صفر';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_balanced_entry(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assert_balanced_entry(uuid) TO authenticated;

-- lines jsonb: [{ "system_key": "cash", "alayh": 10, "lahu": 0 }, ...]
-- or { "account_id": "uuid", "alayh": ..., "lahu": ... }
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
BEGIN
  IF p_lines IS NULL OR jsonb_typeof(p_lines) <> 'array' OR jsonb_array_length(p_lines) < 2 THEN
    RAISE EXCEPTION 'القيد يحتاج سطرين على الأقل';
  END IF;

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
    COALESCE(p_entry_date, (timezone('utc', now()))::date),
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

REVOKE ALL ON FUNCTION public.post_journal_entry(date, text, text, uuid, jsonb, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.post_journal_entry(date, text, text, uuid, jsonb, uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access_accounts"
  ON public.accounts
  FOR ALL
  TO authenticated
  USING (public.get_auth_role() = 'admin')
  WITH CHECK (public.get_auth_role() = 'admin');

CREATE POLICY "cashier_select_accounts"
  ON public.accounts
  FOR SELECT
  TO authenticated
  USING (public.get_auth_role() = 'cashier');

CREATE POLICY "admin_full_access_journal_entries"
  ON public.journal_entries
  FOR ALL
  TO authenticated
  USING (public.get_auth_role() = 'admin')
  WITH CHECK (public.get_auth_role() = 'admin');

CREATE POLICY "admin_full_access_journal_lines"
  ON public.journal_lines
  FOR ALL
  TO authenticated
  USING (public.get_auth_role() = 'admin')
  WITH CHECK (public.get_auth_role() = 'admin');

-- Cashiers do not read journals directly in phase 1 (entries posted via SECURITY DEFINER RPCs)
