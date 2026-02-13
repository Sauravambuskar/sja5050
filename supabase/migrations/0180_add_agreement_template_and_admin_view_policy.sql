-- Add investment agreement template content to system_settings and allow admins to view signed agreements

ALTER TABLE public.system_settings
ADD COLUMN IF NOT EXISTS investment_agreement_text TEXT;

-- Seed a default agreement template (only if empty)
UPDATE public.system_settings
SET investment_agreement_text = COALESCE(
  investment_agreement_text,
  '
This Investment Agreement ("Agreement") is made and entered into on this day by and between SJA Foundation ("the Company") and the undersigned user ("the Investor").

1.  **Investment:** The Investor agrees to invest funds into the plans offered by the Company. The Company agrees to manage these funds according to the terms of the selected investment plan.
2.  **Returns:** The Company will pay returns to the Investor as per the rates and schedule specified in the chosen investment plan. Returns are not guaranteed and are subject to market risks.
3.  **Term:** The investment term shall be as specified in the selected plan. Early withdrawal may be subject to penalties as outlined in the plan details.
4.  **Risks:** The Investor acknowledges that all investments carry risk, and the value of investments can go down as well as up. The Investor has read and understood the risks associated with the investment.
5.  **Confidentiality:** Both parties agree to keep all non-public information confidential.
6.  **Governing Law:** This Agreement shall be governed by the laws of the jurisdiction in which the Company is registered.

By signing below, the Investor acknowledges that they have read, understood, and agree to be bound by the terms and conditions of this Agreement.
'
)
WHERE id = 1;

-- Allow admins to view all signed agreements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'investment_agreements'
      AND policyname = 'Admins can view all investment agreements'
  ) THEN
    CREATE POLICY "Admins can view all investment agreements"
      ON public.investment_agreements
      FOR SELECT
      TO authenticated
      USING (is_admin());
  END IF;
END $$;
