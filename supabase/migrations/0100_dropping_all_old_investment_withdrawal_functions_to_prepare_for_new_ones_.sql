DROP FUNCTION IF EXISTS public.request_investment_withdrawal(uuid, numeric, text);
DROP FUNCTION IF EXISTS public.request_investment_withdrawal(uuid);
DROP FUNCTION IF EXISTS public.get_my_investment_withdrawal_requests();
DROP FUNCTION IF EXISTS public.get_all_investment_withdrawal_requests(text, text, integer, integer);
DROP FUNCTION IF EXISTS public.get_all_investment_withdrawal_requests_count(text, text);
DROP FUNCTION IF EXISTS public.process_investment_withdrawal_request(uuid, text, text);