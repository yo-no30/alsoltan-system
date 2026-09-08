-- DANGER: Wipes transactional data for a clean accounting start.
-- Keeps: users/profiles, categories, products, customers, suppliers,
--         account_types, and the 8 system accounts.
-- Removes: sales, purchases, journals, operating expenses, period closes.
-- Resets: customer/supplier balances, product stock to 0.
--
-- Run once in Supabase SQL Editor (admin). Irreversible without backup.

BEGIN;

-- Break period → journal FK before deleting journals
UPDATE public.accounting_periods
SET closing_entry_id = NULL,
    status = 'open',
    closed_by = NULL,
    closed_at = NULL,
    reopened_by = NULL,
    reopened_at = NULL,
    close_memo = '',
    reopen_memo = '';

-- Expenses (references accounts + journals)
DELETE FROM public.operating_expenses;

-- Ledger (lines cascade from entries)
DELETE FROM public.journal_lines;
DELETE FROM public.journal_entries;

-- Optional: remove period rows entirely (fresh months recreate on next post)
DELETE FROM public.accounting_periods;

-- Invoices
DELETE FROM public.sale_items;
DELETE FROM public.sales;
DELETE FROM public.purchase_items;
DELETE FROM public.purchases;

-- Party balances
UPDATE public.customers SET balance_due = 0;
UPDATE public.suppliers SET balance_due = 0;

-- Stock no longer matches wiped purchases/sales
UPDATE public.products SET stock_quantity = 0;

-- Hard-delete non system accounts (safe now that journals/expenses are gone)
DELETE FROM public.accounts
WHERE system_key IS NULL
   OR system_key NOT IN (
     'cash',
     'bank',
     'ar',
     'ap',
     'inventory',
     'sales',
     'cogs',
     'retained_earnings'
   );

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

COMMIT;
