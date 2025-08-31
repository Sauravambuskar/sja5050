// File contents excluded from context

    (SELECT COUNT(*) FROM public.withdrawal_requests WHERE status = 'Pending') as pending_withdrawals_count,
    (SELECT COALESCE(SUM(amount), 0) FROM public.withdrawal_requests WHERE status = 'Pending') as pending_withdrawals_value,
    (SELECT COUNT(*) FROM public.investment_requests WHERE status = 'Pending') as pending_investments_count,
    (SELECT COALESCE(SUM(amount), 0) FROM public.investment_requests WHERE status = 'Pending') as pending_investments_value,
    (SELECT COALESCE(SUM(ui.investment_amount * (ip.annual_rate / 100.0 / 12.0)), 0) FROM public.user_investments ui JOIN public.investment_plans ip ON ui.plan_id = ip.id WHERE ui.status = 'Active') as monthly_payout_projection;
END;
$function$;