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
  phone: string | null;
  join_date: string;
  kyc_status: string | null;
  wallet_balance: number;
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

export type AdminKycOverview = {
  user_id: string;
  full_name: string;
  email: string;
  aadhaar_number: string | null;
  pan_number: string | null;
  status: string;
  "Aadhaar Front": string | null;
  "Aadhaar Back": string | null;
  "PAN": string | null;
  "Selfie": string | null;
  "Voter ID": string | null;
  "Driving License": string | null;
  "Bank Statement": string | null;
};

export type AdminDashboardStats = {
  total_users: number;
  aum: number;
  pending_kyc: number;
  pending_withdrawals_count: number;
  pending_withdrawals_value: number;
  pending_deposits_count: number;
  pending_deposits_value: number;
  pending_investments_count: number;
  pending_investments_value: number;
  pending_investment_withdrawals_count: number;
  monthly_payout_projection: number;
  pending_cancellations_count: number;
  total_active_investments_count: number;
  total_matured_investments_count: number;
  total_investment_amount_ever: number;
  open_tickets_count: number; // Fix: Add missing property
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

export type UnifiedWithdrawalRequest = {
  request_id: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  request_type: 'Wallet' | 'Investment';
  amount: number;
  requested_at: string;
  status: string;
  details: {
    // Common
    reason?: string | null;
    // Wallet specific
    wallet_balance?: number;
    bank_account_holder_name?: string | null;
    bank_account_number?: string | null;
    bank_ifsc_code?: string | null;
    // Investment specific
    investment_id?: string;
    plan_name?: string;
    investment_amount?: number;
  };
};

export type AdminInvestmentWithdrawalRequest = {
  request_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  plan_name: string;
  investment_amount: number;
  requested_amount: number;
  reason: string | null;
  investment_start_date: string;
  requested_at: string;
  status: string;
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
  request_id: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  request_type: 'Wallet' | 'Investment';
  amount: number;
  requested_at: string;
  status: string;
  details: {
    // Common
    reason?: string | null;
    // Wallet specific
    wallet_balance?: number;
    bank_account_holder_name?: string | null;
    bank_account_number?: string | null;
    bank_ifsc_code?: string | null;
    // Investment specific
    investment_id?: string;
    plan_name?: string;
    investment_amount?: number;
  };
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
  join_date: string;
  kyc_status: string;
  has_invested: boolean;
  level: number;
  parent_id: string;
  children: ReferralTreeUser[];
};

export type ReferralNetworkMember = {
  user_id: string;
  full_name: string;
  member_id: string;
  join_date: string;
  city: string | null;
  sponsor_user_id: string;
  sponsor_full_name: string;
  sponsor_member_id: string;
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
  today_total_income: number;
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

export type ExtendedDashboardStats = {
  total_investment_return: number;
  total_referral_commission: number;
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
  kyc_status: string | null;
  referral_code: string | null;
  referrer_id: string | null;
  role: string;
  bank_account_holder_name: string | null;
  bank_account_number: string | null;
  bank_ifsc_code: string | null;
  member_id: string | null;
  referrer_full_name: string | null;
  pan_number: string | null;
  aadhaar_number: string | null;
  blood_group: string | null;
  bank_name: string | null;
  avatar_url: string | null;
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
  id: number;
  company_name: string;
  logo_url: string | null;
  accent_color: string;
  background_image_url: string | null;
  updated_at: string;
};

export type SystemSettings = {
  id: number;
  maintenance_mode_enabled: boolean;
  maintenance_message: string | null;
  updated_at: string;
  company_bank_details: {
    bank_name: string;
    account_holder_name: string;
    account_number: string;
    ifsc_code: string;
    upi_id: string;
  } | null;
  auth_layout_image_url_1: string | null;
  auth_layout_image_url_2: string | null;
  login_page_logo_url: string | null;
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
  subject: string;
  status: string;
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
  sender_id: string;
  message: string;
  created_at: string;
  profiles: {
    full_name: string | null;
    role: string;
  } | null;
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

export type UserInvestmentCancellationRequest = {
  request_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  plan_name: string;
  investment_amount: number;
  cancellation_amount: number;
  reason: string;
  requested_at: string;
  status: string;
  admin_notes: string | null; // Added this line
};

export type AdminInvestmentCancellationRequest = {
  request_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  plan_name: string;
  investment_amount: number;
  cancellation_amount: number;
  reason: string;
  requested_at: string;
  status: string;
};

export type AdminUserNote = {
  id: string;
  note: string;
  admin_email: string | null;
  is_visible_to_user: boolean;
  created_at: string;
};

export type UserNote = {
  id: string;
  note: string;
  admin_email: string | null;
  created_at: string;
};

export type InvestorPaymentDetail = {
  invt_id: string;
  invt_date: string;
  invt_amount: number;
  rate: number;
  per_day_amount: number;
  total_days: number;
  total_interest: number;
  month_amount: number;
  yearly_amount: number; // Added this line
};

export type Wallet = {
  id: string;
  balance: number;
  currency: string;
  updated_at: string;
  user_id: string;
  wallet_type: 'wallet' | 'investment';
  is_locked: boolean;
  locked_until: string | null;
  transaction_history: Transaction[];
};