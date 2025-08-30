-- This migration removes older, ambiguous database functions to prevent RPC errors.

-- Clean up get_all_kyc_requests
-- Remove the version with no parameters, as a more specific one with filtering and pagination exists.
DROP FUNCTION IF EXISTS public.get_all_kyc_requests();

-- Clean up get_all_investment_withdrawal_requests
-- Remove the two older versions, leaving the one that supports filtering, searching, and pagination.
DROP FUNCTION IF EXISTS public.get_all_investment_withdrawal_requests();
DROP FUNCTION IF EXISTS public.get_all_investment_withdrawal_requests(text, integer, integer);

-- Clean up get_all_deposit_requests
-- Remove the parameter-less version.
DROP FUNCTION IF EXISTS public.get_all_deposit_requests();

-- Clean up get_all_withdrawal_requests
-- Remove the two ambiguous versions.
DROP FUNCTION IF EXISTS public.get_all_withdrawal_requests();
DROP FUNCTION IF EXISTS public.get_all_withdrawal_requests(integer, integer, text);

-- Clean up get_my_withdrawal_requests
-- Remove the parameter-less version to avoid conflict with the paginated one.
DROP FUNCTION IF EXISTS public.get_my_withdrawal_requests();