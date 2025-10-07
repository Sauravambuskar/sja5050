-- Test the function
SELECT * FROM public.get_admin_dashboard_stats();

-- Check if we have actual data
SELECT COUNT(*) as total_users FROM auth.users;
SELECT COALESCE(SUM(investment_amount), 0) as aum FROM public.user_investments WHERE status = 'Active';
SELECT COUNT(*) as pending_kyc FROM public.kyc_documents WHERE status = 'Pending';
SELECT COUNT(*) as pending_withdrawals FROM public.withdrawal_requests WHERE status = 'Pending';