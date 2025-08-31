CREATE OR REPLACE FUNCTION public.get_admin_activity_feed()
 RETURNS TABLE(event_type text, user_id uuid, user_name text, "timestamp" timestamp with time zone, details jsonb)
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
    WITH all_events AS (
        -- New Users
        SELECT
            'new_user' AS event_type,
            p.id AS user_id,
            p.full_name AS user_name,
            u.created_at AS timestamp,
            jsonb_build_object('email', u.email) AS details
        FROM public.profiles p
        JOIN auth.users u ON p.id = u.id

        UNION ALL

        -- New Investments
        SELECT
            'new_investment' AS event_type,
            ui.user_id,
            p.full_name AS user_name,
            ui.created_at AS timestamp,
            jsonb_build_object(
                'amount', ui.investment_amount,
                'plan_name', ip.name
            ) AS details
        FROM public.user_investments ui
        JOIN public.profiles p ON ui.user_id = p.id
        JOIN public.investment_plans ip ON ui.plan_id = ip.id

        UNION ALL

        -- New Deposit Requests
        SELECT
            'deposit_request' AS event_type,
            dr.user_id,
            p.full_name AS user_name,
            dr.requested_at AS timestamp,
            jsonb_build_object('amount', dr.amount) AS details
        FROM public.deposit_requests dr
        JOIN public.profiles p ON dr.user_id = p.id

        UNION ALL

        -- New Withdrawal Requests
        SELECT
            'withdrawal_request' AS event_type,
            wr.user_id,
            p.full_name AS user_name,
            wr.requested_at AS timestamp,
            jsonb_build_object('amount', wr.amount) AS details
        FROM public.withdrawal_requests wr
        JOIN public.profiles p ON wr.user_id = p.id

        UNION ALL

        -- New KYC Submissions
        SELECT
            'kyc_submission' AS event_type,
            kd.user_id,
            p.full_name AS user_name,
            kd.submitted_at AS timestamp,
            jsonb_build_object('document_type', kd.document_type) AS details
        FROM public.kyc_documents kd
        JOIN public.profiles p ON kd.user_id = p.id
    )
    SELECT *
    FROM all_events
    ORDER BY timestamp DESC
    LIMIT 15;
$function$