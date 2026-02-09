select n.nspname as schema,
       p.proname as name,
       pg_get_function_identity_arguments(p.oid) as args,
       pg_get_functiondef(p.oid) as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('request_wallet_withdrawal','request_investment_withdrawal','get_my_withdrawal_requests','get_my_wallet_balance','get_my_withdrawal_requests_count');