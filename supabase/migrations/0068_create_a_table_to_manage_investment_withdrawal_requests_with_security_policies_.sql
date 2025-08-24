-- Create the table to store investment withdrawal requests
CREATE TABLE public.investment_withdrawal_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    investment_id UUID NOT NULL REFERENCES public.user_investments(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'Pending', -- Pending, Approved, Rejected
    admin_notes TEXT,
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.investment_withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Policies for the new table
CREATE POLICY "Users can view their own investment withdrawal requests"
ON public.investment_withdrawal_requests FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create investment withdrawal requests"
ON public.investment_withdrawal_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all investment withdrawal requests"
ON public.investment_withdrawal_requests FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());