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

export type AdminUserView = {
  id: string;
  full_name: string | null;
  email: string | undefined;
  join_date: string;
  kyc_status: string | null;
  wallet_balance: number;
};

export type AdminInvestmentView = {
  investment_id: string;
  user_name: string;
  plan_name: string;
  amount: number;
  start_date: string;
  status: string;
};

export type AdminKycRequest = {
  request_id: string;
  user_id: string;
  user_name: string;
  document_type: string;
  file_path: string;
  submitted_at: string;
  status: string;
};

export type UserInvestment = {
  id: string;
  investment_amount: number;
  start_date: string;
  maturity_date: string;
  status: string;
  investment_plans: {
    name: string;
  }[] | null;
};

export type Transaction = {
  id: string;
  type: string;
  amount: number;
  status: string;
  description: string | null;
  created_at: string;
};

export type DashboardStats = {
  fullName: string | null;
  activeInvestments: number;
  walletBalance: number;
};

export type WithdrawalRequest = {
  id: string;
  amount: number;
  status: string;
  requested_at: string;
};

export type KycDocument = {
  id: string;
  document_type: string;
  file_path: string;
  status: string;
  submitted_at: string;
};