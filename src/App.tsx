import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./components/auth/AuthProvider";
import { Toaster } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Investments from "./pages/Investments";
import Profile from "./pages/Profile";
import Referrals from "./pages/Referrals";
import Support from "./pages/Support";
import Wallet from "./pages/Wallet";
import Withdrawals from "./pages/Withdrawals";
import { PageLayout as MainLayout } from "./components/layout/PageLayout";
import { AuthLayout } from "./components/layout/AuthLayout";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ManageUsers from "./pages/admin/UserManagement";
import ManageInvestments from "./pages/admin/InvestmentManagement";
import ManagePlans from "./pages/admin/ManagePlans";
import ManageRequests from "./pages/admin/RequestManagement";
import ManageWithdrawals from "./pages/admin/WalletWithdrawalManagement";
import ManageSupport from "./pages/admin/SupportDesk";
import SystemSettings from "./pages/admin/SystemManagement";
import UserDetails from "./pages/admin/UserDetails";
import Reports from "./pages/admin/Reporting";
import AdminAuditLog from "./pages/admin/AuditLog";
import Broadcast from "./pages/admin/Broadcast";
import ManageBanners from "./pages/admin/ManageBanners";
import Notifications from "./pages/Notifications";
import TicketDetails from "./pages/TicketDetails";
import Transactions from "./pages/Transactions";
import FaqPage from "./pages/FaqPage";
import IdCard from "./pages/IdCard";
import Nominees from "./pages/Nominees";
import Agreements from "./pages/Agreements";
import UserNotes from "./pages/Notes";
import { AdditionalDocuments } from "./components/profile/AdditionalDocuments";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<AuthWrapper />} />
            <Route path="/login" element={<AuthLayout><Login /></AuthLayout>} />
            <Route path="/register" element={<AuthLayout><Register /></AuthLayout>} />
            
            <Route path="/" element={<MainLayout />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="investments" element={<Investments />} />
              <Route path="transactions" element={<Transactions />} />
              <Route path="profile" element={<Profile />} />
              <Route path="referrals" element={<Referrals />} />
              <Route path="support" element={<Support />} />
              <Route path="support/ticket/:ticketId" element={<TicketDetails />} />
              <Route path="wallet" element={<Wallet />} />
              <Route path="withdrawals" element={<Withdrawals />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="faq" element={<FaqPage />} />
              <Route path="id-card" element={<IdCard />} />
              <Route path="nominees" element={<Nominees />} />
              <Route path="agreements" element={<Agreements />} />
              <Route path="notes" element={<UserNotes />} />
              <Route path="documents" element={<AdditionalDocuments />} />
            </Route>

            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="users" element={<ManageUsers />} />
              <Route path="users/:userId" element={<UserDetails />} />
              <Route path="investments" element={<ManageInvestments />} />
              <Route path="plans" element={<ManagePlans />} />
              <Route path="requests" element={<ManageRequests />} />
              <Route path="withdrawals" element={<ManageWithdrawals />} />
              <Route path="support" element={<ManageSupport />} />
              <Route path="settings" element={<SystemSettings />} />
              <Route path="reports" element={<Reports />} />
              <Route path="audit-log" element={<AdminAuditLog />} />
              <Route path="broadcast" element={<Broadcast />} />
              <Route path="banners" element={<ManageBanners />} />
            </Route>

          </Routes>
        </Router>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

function AuthWrapper() {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>; // Or a proper splash screen
  return user ? <MainLayout /> : <AuthLayout><Login /></AuthLayout>;
}

export default App;