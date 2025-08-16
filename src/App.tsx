import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Layouts
import { PageLayout } from "./components/layout/PageLayout";

// Auth
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { AdminRoute } from "./components/auth/AdminRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import UpdatePassword from "./pages/UpdatePassword";
import LoginMfa from "./pages/LoginMfa";

// Client Pages
import Dashboard from "./pages/Dashboard";
import Investments from "./pages/Investments";
import Wallet from "./pages/Wallet";
import Profile from "./pages/Profile";
import Referrals from "./pages/Referrals";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";
import Agreement from "./pages/Agreement";
import Faq from "./pages/Faq";
import Support from "./pages/Support";
import TicketDetails from "./pages/TicketDetails";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import InvestmentManagement from "./pages/admin/InvestmentManagement";
import WithdrawalManagement from "./pages/admin/WithdrawalManagement";
import KycManagement from "./pages/admin/KycManagement";
import CommissionRules from "./pages/admin/CommissionRules";
import Reporting from "./pages/admin/Reporting";
import AdminLogin from "./pages/admin/AdminLogin";
import AuditLog from "./pages/admin/AuditLog";
import SystemManagement from "./pages/admin/SystemManagement";
import DepositManagement from "./pages/admin/DepositManagement";
import PayoutReports from "./pages/admin/PayoutReports";
import FaqManagement from "./pages/admin/FaqManagement";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Client Portal */}
          <Route element={<ProtectedRoute />}>
            <Route element={<PageLayout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/investments" element={<Investments />} />
              <Route path="/wallet" element={<Wallet />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/referrals" element={<Referrals />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/agreement" element={<Agreement />} />
              <Route path="/faq" element={<Faq />} />
              <Route path="/support" element={<Support />} />
              <Route path="/support/ticket/:ticketId" element={<TicketDetails />} />
              
              {/* Admin Portal Routes */}
              <Route path="/admin" element={<AdminRoute />}>
                <Route index element={<AdminDashboard />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="deposits" element={<DepositManagement />} />
                <Route path="investments" element={<InvestmentManagement />} />
                <Route path="withdrawals" element={<WithdrawalManagement />} />
                <Route path="kyc" element={<KycManagement />} />
                <Route path="commissions" element={<CommissionRules />} />
                <Route path="reports" element={<Reporting />} />
                <Route path="payout-reports" element={<PayoutReports />} />
                <Route path="audit-log" element={<AuditLog />} />
                <Route path="system" element={<SystemManagement />} />
                <Route path="faqs" element={<FaqManagement />} />
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;