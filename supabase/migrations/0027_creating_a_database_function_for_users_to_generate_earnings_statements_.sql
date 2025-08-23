CREATE OR REPLACE FUNCTION public.get_my_earnings_statement(p_start_date date, p_end_date date)
RETURNS TABLE(event_date date, event_type text, description text, amount numeric)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.created_at::date as event_date,
        t.type as event_type,
        t.description,
        t.amount
    FROM public.transactions t
    WHERE t.user_id = auth.uid()
      AND t.type = 'Investment Payout'
      AND t.created_at::date >= p_start_date
      AND t.created_at::date <= p_end_date

    UNION ALL

    SELECT
        cp.payout_date::date as event_date,
        'Commission' as event_type,
        'Referral commission from ' || p.full_name || ' (Level ' || cp.referral_level || ')' as description,
        cp.commission_amount as amount
    FROM public.commission_payouts cp
    JOIN public.profiles p ON cp.source_user_id = p.id
    WHERE cp.recipient_user_id = auth.uid()
      AND cp.payout_date::date >= p_start_date
      AND cp.payout_date::date <= p_end_date

    ORDER BY event_date DESC;
END;
$$;