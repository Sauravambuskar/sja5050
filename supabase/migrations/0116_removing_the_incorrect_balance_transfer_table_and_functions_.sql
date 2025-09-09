DROP FUNCTION IF EXISTS public.get_all_balance_transfers_count(text, text);
DROP FUNCTION IF EXISTS public.get_all_balance_transfers(text, text, integer, integer);
DROP FUNCTION IF EXISTS public.get_my_balance_transfers();
DROP FUNCTION IF EXISTS public.process_balance_transfer(uuid, text, text);
DROP FUNCTION IF EXISTS public.request_balance_transfer(text, numeric, text);
DROP TABLE IF EXISTS public.balance_transfers;