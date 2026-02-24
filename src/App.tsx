import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { Loader2 } from "lucide-react";

// Layouts
import { PageLayout } from "@/components/layout/PageLayout";

// Auth guards (keep eager)
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";

// Lazily loaded pages (code-splitting)
const Login = lazy(() => import("@/pages/Login"));
const Register = lazy(() => import("@/pages/Register"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const UpdatePassword = lazy(() => import("@/pages/UpdatePassword"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Maintenance = lazy(() => import("@/pages/Maintenance"));
const LoginMfa = lazy(() => import("@/pages/LoginMfa"));
const PrivacyPolicy = lazy(() => import("@/pages/Privacypolicy"));
const Terms = lazy(() => import("@/pages/Terms"));

// User pages
const DashboardLoader = lazy(() => import("@/pages/DashboardLoader"));
const Investments = lazy(() => import("@/pages/Investments"));
const Withdrawals = lazy(() => import("@/pages/Withdrawals"));
const Wallet = lazy(() => import("@/pages/Wallet"));
const Profile = lazy(() => import("@/pages/Profile"));
const Referrals = lazy(() => import("@/pages/Referrals"));
const PaymentDetails = lazy(() => import("@/pages/PaymentDetails"));
const Reports = lazy(() => import("@/pages/Reports"));
const Notes = lazy(() => import("@/pages/Notes"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const Agreement = lazy(() => import("@/pages/Agreement"));
const Faq = lazy(() => import("@/pages/Faq"));
const Support = lazy(() => import("@/pages/Support"));
const TicketDetails = lazy(() => import("@/pages/TicketDetails"));
const ReceiptPayout = lazy(() => import("@/pages/ReceiptPayout"));
const PaymentHistory = lazy(() => import("@/pages/PaymentHistory"));

// Admin pages
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const UserManagement = lazy(() => import("@/pages/admin/UserManagement"));
const KycManagement = lazy(() => import("@/pages/admin/KycManagement"));
const RequestManagement = lazy(() => import("@/pages/admin/RequestManagement"));
const InvestmentRequestManagement = lazy(() => import("@/pages/admin/InvestmentRequestManagement"));
const WalletWithdrawalManagement = lazy(() => import("@/pages/admin/WalletWithdrawalManagement"));
const InvestmentManagement = lazy(() => import("@/pages/admin/InvestmentManagement"));
const CommissionRules = lazy(() => import("@/pages/admin/CommissionRules"));
const SystemManagement = lazy(() => import("@/pages/admin/SystemManagement"));
const Reporting = lazy(() => import("@/pages/admin/Reporting"));
const PayoutReports = lazy(() => import("@/pages/admin/PayoutReports"));
const FinancialReporting = lazy(() => import("@/pages/admin/FinancialReporting"));
const FaqManagement = lazy(() => import("@/pages/admin/FaqManagement"));
const SupportDesk = lazy(() => import("@/pages/admin/SupportDesk"));
const AdminTicketDetails = lazy(() => import("@/pages/admin/AdminTicketDetails"));
const ClientPaymentDetails = lazy(() => import("@/pages/admin/ClientPaymentDetails"));
const MasterReports = lazy(() => import("@/pages/admin/MasterReports"));
const InvestmentCancellationManagement = lazy(() => import("@/pages/admin/InvestmentCancellationManagement"));
const AuditLog = lazy(() => import("@/pages/admin/AuditLog"));
const AdminLogin = lazy(() => import("@/pages/admin/AdminLogin"));
const AdminLedger = lazy(() => import("@/pages/admin/Ledger"));
const ReferralManagement = lazy(() => import("@/pages/admin/ReferralManagement"));
const AdminPayoutReceipt = lazy(() => import("@/pages/admin/AdminPayoutReceipt"));
const AdminPaymentHistory = lazy(() => import("@/pages/admin/PaymentHistory"));

const queryClient = new QueryClient();

const RouteLoading = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin" />
  </div>
);

const App = () => (
  <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
    <TooltipProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MainRouter />
          <Toaster richColors />
        </AuthProvider>
      </QueryClientProvider>
    </TooltipProvider>
  </ThemeProvider>
);

const MainRouter = () => (
  <Suspense fallback={<RouteLoading />}>
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route element={<PageLayout />}>
          {/* User Portal Routes */}
          <Route path="/" element={<DashboardLoader />} />
          <Route path="/investments" element={<Investments />} />
          <Route path="/withdrawals" element={<Withdrawals />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/referrals" element={<Referrals />} />
          <Route path="/payment-details" element={<PaymentDetails />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/payments" element={<PaymentHistory />} />
          <Route path="/receipts/payout/:investmentId/:payoutMonth" element={<ReceiptPayout />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/agreement" element={<Agreement />} />
          <Route path="/faq" element={<Faq />} />
          <Route path="/support" element={<Support />} />
          <Route path="/support/ticket/:ticketId" element={<TicketDetails />} />

          {/* Admin Portal Routes */}
          <Route path="/admin" element={<AdminRoute />}>
            <Route index element={<AdminDashboard />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="user-management" element={<UserManagement />} />
            <Route path="referral-management" element={<ReferralManagement />} />
            <Route path="users/:userId/payment-details" element={<ClientPaymentDetails />} />
            <Route path="request-management" element={<RequestManagement />} />
            <Route path="wallet-withdrawal-management" element={<WalletWithdrawalManagement />} />
            <Route path="investment-requests" element={<InvestmentRequestManagement />} />
            <Route path="investment-cancellations" element={<InvestmentCancellationManagement />} />
            <Route path="investment-management" element={<InvestmentManagement />} />
            <Route path="kyc-management" element={<KycManagement />} />
            <Route path="support-desk" element={<SupportDesk />} />
            <Route path="support-desk/ticket/:ticketId" element={<AdminTicketDetails />} />
            <Route path="commission-rules" element={<CommissionRules />} />
            <Route path="reporting" element={<Reporting />} />
            <Route path="payout-reports" element={<PayoutReports />} />
            <Route path="payments" element={<AdminPaymentHistory />} />
            <Route path="financial-reports" element={<FinancialReporting />} />
            <Route path="master-reports" element={<MasterReports />} />
            <Route path="faq-management" element={<FaqManagement />} />
            <Route path="audit-log" element={<AuditLog />} />
            <Route path="system-management" element={<SystemManagement />} />
            <Route path="ledger" element={<AdminLedger />} />
            <Route path="receipts/payout/:investmentId/:payoutMonth" element={<AdminPayoutReceipt />} />
          </Route>
        </Route>
      </Route>

      {/* Public Pages */}
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms" element={<Terms />} />

      {/* Auth & Fallback */}
      <Route path="/login" element={<Login />} />
      <Route path="/login/mfa" element={<LoginMfa />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/update-password" element={<UpdatePassword />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/maintenance" element={<Maintenance />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </Suspense>
);

export default App;