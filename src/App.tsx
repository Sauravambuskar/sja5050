import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route } from "react-router-dom";

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
import DashboardLoader from "./pages/DashboardLoader";
import Investments from "./pages/Investments";
import Profile from "./pages/Profile";
import Referrals from "./pages/Referrals";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";

// Admin Pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import UserManagement from "./pages/admin/UserManagement";
import InvestmentManagement from "./pages/admin/InvestmentManagement";
import InvestmentRequestManagement from "./pages/admin/InvestmentRequestManagement";
import CommissionRules from "./pages/admin/CommissionRules";
import Reporting from "./pages/admin/Reporting";
import AdminLogin from "./pages/admin/AdminLogin";
import AuditLog from "./pages/admin/AuditLog";
import SystemManagement from "./pages/admin/SystemManagement";
import PayoutReports from "./pages/admin/PayoutReports";
import FinancialReporting from "./pages/admin/FinancialReporting";
import FaqManagement from "./pages/admin/FaqManagement";
import SupportDesk from "./pages/admin/SupportDesk";
import AdminTicketDetails from "./pages/admin/AdminTicketDetails";
import ClientPaymentDetails from "./pages/admin/ClientPaymentDetails";
import MasterReports from "./pages/admin/MasterReports";

const queryClient = new QueryClient();

const App = () => (
  <>
    <Sonner />
    <Routes>
      {/* Client Portal */}
      <Route element={<ProtectedRoute />}>
        <Route element={<PageLayout />}>
          <Route path="/" element={<DashboardLoader />} />
          <Route path="/investments" element={<Investments />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/referrals" element={<Referrals />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/support" element={<SupportDesk />} />
          <Route path="/support/ticket/:ticketId" element={<AdminTicketDetails />} />
          
          {/* Admin Portal Routes */}
          <Route path="/admin" element={<AdminRoute />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="users/:userId/payment-details" element={<ClientPaymentDetails />} />
            <Route path="investment-requests" element={<InvestmentRequestManagement />} />
            <Route path="investments" element={<InvestmentManagement />} />
            <Route path="support" element={<SupportDesk />} />
            <Route path="support/ticket/:ticketId" element={<AdminTicketDetails />} />
            <Route path="commissions" element={<CommissionRules />} />
            <Route path="reports" element={<Reporting />} />
            <Route path="payout-reports" element={<PayoutReports />} />
            <Route path="financial-reports" element={<FinancialReporting />} />
            <Route path="master-reports" element={<MasterReports />} />
            <Route path="faqs" element={<FaqManagement />} />
            <Route path="audit-log" element={<AuditLog />} />
            <Route path="system" element={<SystemManagement />} />
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
  </>
);

export default App;