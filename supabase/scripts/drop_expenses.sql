-- Removes operating expenses module from a live DB.
-- Keeps journal history (source_type may still be 'expense').

DROP FUNCTION IF EXISTS public.record_operating_expense(date, uuid, numeric, text, text);
DROP FUNCTION IF EXISTS public.record_expense(date, uuid, numeric, text, text);
DROP FUNCTION IF EXISTS public.record_petty_expense(numeric, uuid, text);

DROP TABLE IF EXISTS public.operating_expenses CASCADE;
DROP TABLE IF EXISTS public.expenses CASCADE;
