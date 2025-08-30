-- Create withdrawal_requests table
CREATE TABLE public.withdrawal_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending',
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  admin_notes TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS on withdrawal_requests table
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own withdrawal requests
CREATE POLICY "Users can view their own withdrawal requests" ON public.withdrawal_requests
FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Policy: Users can create withdrawal requests
CREATE POLICY "Users can create withdrawal requests" ON public.withdrawal_requests
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Policy: Admins can manage all withdrawal requests
CREATE POLICY "Admins can manage all withdrawal requests" ON public.withdrawal_requests
FOR ALL TO authenticated USING (public.is_admin());