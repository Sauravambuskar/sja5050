DROP FUNCTION IF EXISTS public.get_admin_activity_feed();

CREATE OR REPLACE FUNCTION public.get_admin_activity_feed()
 RETURNS TABLE(event_type text, user_id uuid, user_name text, event_timestamp timestamp with time zone, details jsonb)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
    WITH all_events AS (
        -- New Users
        SELECT
            'new_user'::text AS event_type,
            p.id AS user_id,
            p.full_name AS user_name,
            u.created_at AS event_timestamp,
            jsonb_build_object('email', u.email) AS details
        FROM public.profiles p
        JOIN auth.users u ON p.id = u.id
        WHERE u.created_at >= NOW() - INTERVAL '7 days'

        UNION ALL

        -- New Investments
        SELECT
            'new_investment'::text AS event_type,
            ui.user_id,
            p.full_name AS user_name,
            ui.created_at AS event_timestamp,
            jsonb_build_object(
                'amount', ui.investment_amount,
                'plan_name', ip.name
            ) AS details
        FROM public.user_investments ui
        JOIN public.profiles p ON ui.user_id = p.id
        JOIN public.investment_plans ip ON ui.plan_id = ip.id
        WHERE ui.created_at >= NOW() - INTERVAL '7 days'

        UNION ALL

        -- New Deposit Requests
        SELECT
            'deposit_request'::text AS event_type,
            dr.user_id,
            p.full_name AS user_name,
            dr.created_at AS event_timestamp,
            jsonb_build_object('amount', dr.amount) AS details
        FROM public.investment_requests dr
        JOIN public.profiles p ON dr.user_id = p.id
        WHERE dr.screenshot_path IS NOT NULL AND dr.created_at >= NOW() - INTERVAL '7 days'

        UNION ALL

        -- New Withdrawal Requests
        SELECT
            'withdrawal_request'::text AS event_type,
            wr.user_id,
            p.full_name AS user_name,
            wr.requested_at AS event_timestamp,
            jsonb_build_object('amount', wr.amount) AS details
        FROM public.withdrawal_requests wr
        JOIN public.profiles p ON wr.user_id = p.id
        WHERE wr.requested_at >= NOW() - INTERVAL '7 days'

        UNION ALL

        -- New KYC Submissions
        SELECT
            'kyc_submission'::text AS event_type,
            kd.user_id,
            p.full_name AS user_name,
            kd.submitted_at AS event_timestamp,
            jsonb_build_object('document_type', kd.document_type) AS details
        FROM public.kyc_documents kd
        JOIN public.profiles p ON kd.user_id = p.id
        WHERE kd.submitted_at >= NOW() - INTERVAL '7 days'
    )
    SELECT *
    FROM all_events
    ORDER BY event_timestamp DESC
    LIMIT 15;
$function$