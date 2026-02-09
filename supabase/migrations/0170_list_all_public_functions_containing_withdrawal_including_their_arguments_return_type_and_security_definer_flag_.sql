select p.proname as name,
       pg_get_function_identity_arguments(p.oid) as args,
       pg_get_function_result(p.oid) as return_type,
       p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname='public'
  and p.proname ilike '%withdrawal%'
order by p.proname;