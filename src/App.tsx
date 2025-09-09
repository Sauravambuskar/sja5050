import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminRoute } from "@/components/auth/AdminRoute";
import { PageLayout } from "@/components/layout/PageLayout";

// Core Pages
import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import UpdatePassword from "@/pages/UpdatePassword";
import NotFound from "@/pages/NotFound";
import Maintenance from "@/pages/Maintenance";
import LoginMfa from "@/pages/LoginMfa";

// User Pages
import Investments from "@/pages/Investments";
import Withdrawals from "@/pages/Withdrawals";
import Profile from "@/pages/Profile";
import Referrals from "@/pages/Referrals";
import PaymentDetails from "@/pages/PaymentDetails";
import Reports from "@/pages/Reports";
import Notes from "@/pages/Notes";
import Notifications from "@/pages/Notifications";
import Agreement from "@/pages/Agreement";
import Faq from "@/pages/Faq";
import Support from "@/pages/Support";
import TicketDetails from "@/pages/TicketDetails";

// Admin Pages
import AdminDashboard from "@/pages/admin/AdminDashboard";
import UserManagement from "@/pages/admin/UserManagement";
import KycManagement from "@/pages/admin/KycManagement";
import InvestmentRequestManagement from "@/pages/admin/InvestmentRequestManagement";
import InvestmentManagement from "@/pages/admin/InvestmentManagement";
import CommissionRules from "@/pages/admin/CommissionRules";
import SystemManagement from "@/pages/admin/SystemManagement";
import Reporting from "@/pages/admin/Reporting";
import PayoutReports from "@/pages/admin/PayoutReports";
import FinancialReporting from "@/pages/admin/FinancialReporting";
import FaqManagement from "@/pages/admin/FaqManagement";
import SupportDesk from "@/pages/admin/SupportDesk";
import AdminTicketDetails from "@/pages/admin/AdminTicketDetails";
import ClientPaymentDetails from "@/pages/admin/ClientPaymentDetails";
import MasterReports from "@/pages/admin/MasterReports";
import InvestmentCancellationManagement from "@/pages/admin/InvestmentCancellationManagement";
import AuditLog from "@/pages/admin/AuditLog";
import AdminLogin from "@/pages/admin/AdminLogin";
import DashboardLoader from "@/pages/DashboardLoader"; // Import DashboardLoader

const queryClient = new QueryClient();

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
  <>
    <Routes>
      <Route element={<ProtectedRoute />}>
        <Route element={<PageLayout />}>
          {/* User Portal Routes */}
          <Route path="/" element={<DashboardLoader />} />
          <Route path="/investments" element={<Investments />} />
          <Route path="/withdrawals" element={<Withdrawals />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/referrals" element={<Referrals />} />
          <Route path="/payment-details" element={<PaymentDetails />} />
          <Route path="/reports" element={<Reports />} />
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
            <Route path="users/:userId/payment-details" element={<ClientPaymentDetails />} />
            <Route path="investment-requests" element={<InvestmentRequestManagement />} />
            <Route path="investment-cancellations" element={<InvestmentCancellationManagement />} />
            <Route path="investment-management" element={<InvestmentManagement />} />
            <Route path="kyc-management" element={<KycManagement />} />
            <Route path="support-desk" element={<SupportDesk />} />
            <Route path="support-desk/ticket/:ticketId" element={<AdminTicketDetails />} />
            <Route path="commission-rules" element={<CommissionRules />} />
            <Route path="reporting" element={<Reporting />} />
            <Route path="payout-reports" element={<PayoutReports />} />
            <Route path="financial-reports" element={<FinancialReporting />} />
            <Route path="master-reports" element={<MasterReports />} />
            <Route path="faq-management" element={<FaqManagement />} />
            <Route path="audit-log" element={<AuditLog />} />
            <Route path="system-management" element={<SystemManagement />} />
          </Route>
        </Route>
      </Route>

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
  </>
);

export default App;