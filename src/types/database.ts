export type InvestmentPlan = {
  id: string;
  name: string;
  description: string;
  annual_rate: number;
  duration_months: number;
  min_investment: number;
  max_investment: number | null;
  is_active: boolean;
  created_at: string;
  image_url: string | null;
};

export type Nominee = {
  id: string;
  user_id: string;
  full_name: string;
  relationship: string;
  dob: string | null;
  blood_group: string | null;
  created_at: string;
};

export type AdminUserView = {
  id: string;
  full_name: string | null;
  email: string | undefined;
  join_date: string;
  kyc_status: string | null;
  role: 'user' | 'admin';
  banned_until: string | null;
  last_sign_in_at: string | null;
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
  user_email: string;
  document_type: string;
  file_path: string;
  submitted_at: string;
  status: string;
  admin_notes: string | null;
};

export type AdminDashboardStats = {
  total_users: number;
  aum: number;
  pending_investments_count: number;
  pending_investments_value: number;
  monthly_payout_projection: number;
};

export type BirthdayUser = {
  id: string;
  full_name: string;
  dob: string;
};

export type AdminWithdrawalRequest = {
  request_id: string;
  user_name: string | null;
  user_id: string;
  user_email: string | null;
  amount: number;
  requested_at: string;
  status: string;
  bank_account_holder_name: string | null;
  bank_account_number: string | null;
  bank_ifsc_code: string | null;
  wallet_balance: number;
};

export type AdminInvestmentWithdrawalRequest = {
  request_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  plan_name: string;
  investment_amount: number;
  investment_start_date: string;
  requested_at: string;
  status: 'Pending' | 'Approved' | 'Rejected';
};

export type AdminDepositRequest = {
  request_id: string;
  user_name: string | null; // Changed to allow null
  user_id: string;
  user_email: string | null; // Changed to allow null
  amount: number;
  reference_id: string;
  requested_at: string;
  status: string;
  screenshot_path: string | null;
  admin_notes: string | null;
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

export type CommissionPayout = {
  id: string;
  from_user_name: string;
  amount: number;
  payout_date: string;
  level: number;
};

export type UserInvestment = {
  id: string;
  user_id: string;
  plan_id: string;
  investment_amount: number;
  start_date: string;
  maturity_date: string;
  status: string;
  created_at: string;
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
  kycStatus: string | null;
  referralCount: number;
};

export type WithdrawalRequest = {
  id: string;
  amount: number;
  status: string;
  requested_at: string;
  admin_notes: string | null;
};

export type DepositRequest = {
  id: string;
  amount: number;
  reference_id: string;
  status: string;
  requested_at: string;
  admin_notes: string | null;
};

export type KycDocument = {
  id: string;
  document_type: string;
  file_path: string;
  status: string;
  submitted_at: string;
  reviewed_at: string | null; // Keep this as it's fetched now
  admin_notes: string | null;
};

export type Referral = {
  id: string;
  full_name: string;
  join_date: string;
  kyc_status: string;
  has_invested: boolean;
};

export type ReferralTreeUser = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  join_date: string;
  kyc_status: string;
  has_invested: boolean;
  level: number;
  parent_id: string | null;
  children: ReferralTreeUser[];
};

export type UserGrowthReportData = {
  month_start: string;
  user_count: number;
  month: string;
};

export type Notification = {
  id: string;
  title: string;
  description: string | null;
  type: 'info' | 'success' | 'error' | 'warning';
  link_to: string | null;
  is_read: boolean;
  created_at: string;
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

export type PayoutReportItem = {
  user_id: string;
  user_name: string;
  investment_id: string;
  plan_name: string;
  investment_amount: number;
  start_date: string;
  maturity_date: string;
  monthly_profit: number;
  status: string;
  bank_account_holder_name: string | null;
  bank_account_number: string | null;
  bank_ifsc_code: string | null;
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
  investment_income: number;
  commission_income: number;
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
  updated_at: string | null;
  kyc_status: 'Not Submitted' | 'Pending Review' | 'Approved' | 'Rejected';
  referral_code: string | null;
  referrer_id: string | null;
  role: 'user' | 'admin';
  bank_name: string | null;
  bank_account_holder_name: string | null;
  bank_account_number: string | null;
  bank_ifsc_code: string | null;
  referrer_full_name: string | null;
  member_id: string | null;
  pan_number: string | null;
  aadhaar_number: string | null;
  blood_group: string | null;
};

export type InvestmentSummary = {
  total_invested: number;
  active_investments_count: number;
  estimated_daily_earnings: number;
};

export type BroadcastMessage = {
  id: string;
  admin_email: string;
  title: string;
  description: string;
  created_at: string;
};

export type IdCardSettings = {
  company_name: string;
  logo_url: string | null;
  accent_color: string;
  background_image_url: string | null;
};

export type SystemSettings = {
  maintenance_mode_enabled: boolean;
  maintenance_message: string | null;
  company_bank_details: any | null;
  auth_layout_image_url_1: string | null;
  auth_layout_image_url_2: string | null;
  splash_screen_url: string | null;
};

export type Faq = {
  id: string;
  category: string;
  question: string;
  answer: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export type SupportTicket = {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  subject: string;
  status: 'Open' | 'In Progress' | 'Closed';
  created_at: string;
  updated_at: string;
};

export type AdminSupportTicket = SupportTicket & {
  user_id: string;
  full_name: string;
  email: string;
};

export type SupportMessage = {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  created_at: string;
};

export type AdditionalDocument = {
  id: string;
  user_id: string;
  document_name: string;
  file_path: string;
  uploaded_at: string;
  uploaded_by: string;
};

export type MasterUserReportItem = {
  member_id: string | null;
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  role: string;
  join_date: string;
  last_sign_in_at: string | null;
  account_status: string;
  kyc_status: string | null;
  wallet_balance: number | null;
  dob: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  pan_number: string | null;
  aadhaar_number: string | null;
  blood_group: string | null;
  bank_account_holder_name: string | null;
  bank_account_number: string | null;
  bank_ifsc_code: string | null;
  referral_code: string | null;
  referrer_id: string | null;
};

export type MasterInvestmentReportItem = {
  investment_id: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  plan_name: string | null;
  investment_amount: number;
  start_date: string;
  maturity_date: string;
  status: string;
  created_at: string;
};

export type MasterTransactionReportItem = {
  transaction_id: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  type: string;
  amount: number;
  status: string;
  description: string | null;
  created_at: string;
};

export type UserInvestmentWithdrawalRequest = {
  request_id: string;
  plan_name: string;
  investment_amount: number;
  requested_at: string;
  status: string;
  admin_notes: string | null;
};

export type ActiveInvestment = {
  id: string;
  plan_name: string;
  investment_amount: number;
  start_date: string;
  maturity_date: string;
  status: string;
};

export type AdminAuditLogEntry = {
  id: string;
  created_at: string;
  admin_email: string;
  action: string;
  target_user_id: string | null;
  details: any;
};