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

export type UserInvestment = {
  id: string;
  plan_name: string;
  investment_amount: number;
  start_date: string;
  maturity_date: string;
  status: string;
};

export type Transaction = {
  id: string;
  type: string;
  amount: number;
  status: string;
  description: string | null;
  created_at: string;
};

export type WithdrawalRequest = {
  id: string;
  amount: number;
  status: string;
  created_at: string;
};