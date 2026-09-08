-- Run in Supabase SQL Editor on a live DB that already applied employees/payroll/advances.
-- Removes employees, payroll, advances, related RPCs, and the سلف الموظفين account when unused.
-- Does NOT delete historical journal entries (source_type may still be 'payroll').

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.pay_payroll(uuid, text);
DROP FUNCTION IF EXISTS public.accrue_payroll(uuid);
DROP FUNCTION IF EXISTS public.delete_payroll_line(uuid, uuid);
DROP FUNCTION IF EXISTS public.upsert_payroll_line(uuid, uuid, numeric, numeric);
DROP FUNCTION IF EXISTS public.create_payroll_run(integer, integer, text);
DROP FUNCTION IF EXISTS public.record_employee_advance(uuid, numeric, text, text, date);

-- ---------------------------------------------------------------------------
-- Tables (dependents first)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS public.payroll_lines CASCADE;
DROP TABLE IF EXISTS public.payroll_runs CASCADE;
DROP TABLE IF EXISTS public.employee_advances CASCADE;
DROP TABLE IF EXISTS public.employees CASCADE;

-- ---------------------------------------------------------------------------
-- Chart account: 1401 / employee_advances
-- Delete only when no journal lines reference it; otherwise deactivate.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_account_id uuid;
  v_used boolean;
BEGIN
  SELECT id INTO v_account_id
  FROM public.accounts
  WHERE system_key = 'employee_advances' OR code = '1401'
  LIMIT 1;

  IF v_account_id IS NULL THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.journal_lines WHERE account_id = v_account_id
  ) INTO v_used;

  IF v_used THEN
    UPDATE public.accounts
    SET
      is_active = false,
      is_postable = false,
      system_key = NULL,
      name = 'سلف الموظفين (موقوف — قديم)'
    WHERE id = v_account_id;
  ELSE
    DELETE FROM public.accounts WHERE id = v_account_id;
  END IF;
END;
$$;
