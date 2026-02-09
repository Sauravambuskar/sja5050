create or replace function public.request_investment_withdrawal(
  p_investment_id uuid,
  p_amount numeric,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = 'public'
as $$
declare
  v_user_id uuid := auth.uid();
  v_principal numeric;
  v_already_pending boolean;
begin
  if v_user_id is null then
    raise exception 'Unauthorized';
  end if;

  if p_investment_id is null then
    raise exception 'Investment is required.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive.';
  end if;

  select ui.investment_amount into v_principal
  from public.user_investments ui
  where ui.id = p_investment_id
    and ui.user_id = v_user_id
    and ui.status = 'Active';

  if v_principal is null then
    raise exception 'This investment is not active or does not belong to you.';
  end if;

  if p_amount > v_principal then
    raise exception 'Withdrawal amount cannot exceed the investment principal.';
  end if;

  select exists(
    select 1
    from public.withdrawal_requests wr
    where wr.user_id = v_user_id
      and wr.type = 'Investment'
      and wr.status = 'Pending'
      and (wr.details->>'investment_id') = p_investment_id::text
  ) into v_already_pending;

  if v_already_pending then
    raise exception 'A withdrawal request for this investment is already pending.';
  end if;

  insert into public.withdrawal_requests (user_id, amount, type, status, details, requested_at)
  values (
    v_user_id,
    p_amount,
    'Investment',
    'Pending',
    jsonb_build_object(
      'investment_id', p_investment_id::text,
      'reason', nullif(btrim(p_reason), '')
    ),
    now()
  );
end;
$$;