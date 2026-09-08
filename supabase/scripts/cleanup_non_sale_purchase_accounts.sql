-- Cleanup chart of accounts: keep only sale/purchase (+ close) system accounts.
-- Keep: cash, bank, ar, ap, inventory, sales, cogs, retained_earnings
--
-- Same logic is embedded in 00017 / apply_account_types_redesign.sql.
-- Use this standalone script only if redesign already ran without cleanup.
--
-- Accounts referenced by journal_lines or operating_expenses cannot be deleted
-- (FK RESTRICT); those are deactivated instead.

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
  v_deleted integer := 0;
  v_deactivated integer := 0;
BEGIN
  -- Soft-disable rows that are in use but not in the keep list
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
      OR EXISTS (
        SELECT 1
        FROM public.operating_expenses oe
        WHERE oe.account_id = a.id
      )
    );

  GET DIAGNOSTICS v_deactivated = ROW_COUNT;

  -- Hard-delete unused non-keep accounts
  DELETE FROM public.accounts a
  WHERE (
      a.system_key IS NULL
      OR a.system_key <> ALL (v_keep)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.journal_lines jl WHERE jl.account_id = a.id
    )
    AND NOT EXISTS (
      SELECT 1
      FROM public.operating_expenses oe
      WHERE oe.account_id = a.id
    );

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RAISE NOTICE 'Deleted % unused accounts; deactivated % in-use accounts',
    v_deleted, v_deactivated;
END $$;

-- Ensure the eight keep accounts stay active + postable
UPDATE public.accounts
SET is_active = true,
    is_postable = true
WHERE system_key IN (
  'cash',
  'bank',
  'ar',
  'ap',
  'inventory',
  'sales',
  'cogs',
  'retained_earnings'
);
