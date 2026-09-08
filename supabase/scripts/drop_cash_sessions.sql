-- Keeps: transfer_cash_to_bank, journal history.
-- Petty expense was removed with the expenses module (see drop_expenses.sql).

DROP FUNCTION IF EXISTS public.open_cash_session(numeric, text);
DROP FUNCTION IF EXISTS public.close_cash_session(uuid, numeric, text);
DROP TABLE IF EXISTS public.cash_sessions CASCADE;
