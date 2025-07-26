export type InvestmentPlan = {
  id: string;
  name: string;
  description: string | null;
  annual_rate: number;
  duration_months: number;
  min_investment: number;
  is_active: boolean;
  created_at: string;
};

export type AppUser = {
  id: string;
  full_name: string;
  email: string;
  join_date: string;
  status: string;
};