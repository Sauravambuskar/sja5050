create or replace function public.admin_create_user_investment(
  p_user_id uuid,
  p_plan_id uuid,
  p_amount numeric,
  p_start_date date default current_date
)
returns uuid
language plpgsql
security definer
set search_path = 'public', 'auth'
as $$
declare
  plan record;
  new_maturity date;
  new_id uuid;
  admin_email text;
begin
  if not public.is_admin() then
    raise exception 'Permission denied. Must be an admin.';
  end if;

  if p_user_id is null or p_plan_id is null then
    raise exception 'User and plan are required.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Amount must be positive.';
  end if;

  select * into plan
  from public.investment_plans
  where id = p_plan_id;

  if not found then
    raise exception 'Plan not found.';
  end if;

  if coalesce(plan.is_active, false) is not true then
    raise exception 'Plan is disabled. Enable it before adding investment.';
  end if;

  if p_amount < plan.min_investment then
    raise exception 'Amount is below the minimum for this plan.';
  end if;

  if plan.max_investment is not null and p_amount > plan.max_investment then
    raise exception 'Amount exceeds the maximum for this plan.';
  end if;

  new_maturity := (p_start_date + (plan.duration_months * interval '1 month'))::date;

  insert into public.user_investments (user_id, plan_id, investment_amount, start_date, maturity_date, status)
  values (p_user_id, p_plan_id, p_amount, p_start_date, new_maturity, 'Active')
  returning id into new_id;

  insert into public.transactions (user_id, type, amount, description, status)
  values (p_user_id, 'Investment', p_amount, 'Admin added investment in ' || plan.name, 'Completed');

  select email into admin_email from auth.users where id = auth.uid();

  insert into public.admin_audit_log (admin_id, admin_email, action, target_user_id, details)
  values (
    auth.uid(),
    admin_email,
    'admin_added_investment',
    p_user_id,
    jsonb_build_object(
      'investment_id', new_id,
      'plan_id', p_plan_id,
      'amount', p_amount,
      'start_date', p_start_date
    )
  );

  insert into public.notifications (user_id, title, description, type, link_to)
  values (
    p_user_id,
    'New Investment Added',
    'An admin has added an investment of ₹' || p_amount::text || ' in ' || plan.name || '.',
    'info',
    '/investments'
  );

  return new_id;
end;
$$;