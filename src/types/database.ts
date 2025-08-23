export type InvestmentPlan = {
  id: string;
  name: string;
  description: string | null;
  annual_rate: number;
  duration_months: number;
  min_investment: number;
  max_investment: number | null;
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
  role: 'user' | 'admin';
  banned_until: string | null;
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

export type AdminDashboardStats = {
  total_users: number;
  aum: number;
  pending_kyc: number;
  pending_withdrawals_count: number;
  pending_withdrawals_value: number;
};

export type AdminWithdrawalRequest = {
  request_id: string;
  user_name: string;
  amount: number;
  requested_at: string;
  status: string;
  bank_account_holder_name: string | null;
  bank_account_number: string | null;
  bank_ifsc_code: string | null;
  wallet_balance: number;
};

export type CommissionRule = {
  level: number;
  rate: number;
  is_active: boolean;
};

export type CommissionStats = {
  total_commission_earned: number;
  total_referrals: number;
};

export type CommissionHistoryItem = {
  id: string;
  from_user_name: string;
  amount: number;
  payout_date: string;
  level: number;
};

export type UserInvestment = {
  id: string;
  investment_amount: number;
  start_date: string;
  maturity_date: string;
  status: string;
  investment_plans: {
    name: string;
    annual_rate: number;
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
  activeInvestmentsCount: number;
  totalInvested: number;
  walletBalance: number;
  kycStatus: string | null;
  referralCount: number;
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
  admin_notes: string | null;
};

export type Referral = {
  id: string;
  full_name: string;
  join_date: string;
  kyc_status: string;
};

export type UserGrowthReportData = {
  month_start: string;
  user_count: number;
  month: string;
};

export type Notification = {
  id: string;
  title: string;
  description: string;
  type: 'success' | 'error' | 'info' | 'warning';
  is_read: boolean;
  created_at: string;
  link_to: string | null;
};

export type AdminUserInvestmentHistoryItem = {
  id: string;
  plan_name: string;
  investment_amount: number;
  start_date: string;
  status: string;
};

export type AdminHighValueTransaction = {
  id: string;
  user_id: string;
  user_name: string;
  type: string;
  amount: number;
  created_at: string;
};

export type CommissionPayoutReportData = {
  month_start: string;
  total_commission: number;
  month: string;
};

export type DailyIncomeStats = {
  today_investment_income: number;
  today_commission_income: number;
};

export type IncomeHistoryReportData = {
  report_date: string;
  total_income: number;
  day: string;
};

export type NewInvestmentsReportData = {
  month_start: string;
  total_investment_amount: number;
  month: string;
};

export type AumGrowthReportData = {
  month_start: string;
  total_aum: number;
  month: string;
};

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  dob: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  kyc_status: string | null;
  nominee_name: string | null;
  nominee_relationship: string | null;
  nominee_dob: string | null;
  role: string;
  bank_account_holder_name: string | null;
  bank_account_number: string | null;
  bank_ifsc_code: string | null;
};