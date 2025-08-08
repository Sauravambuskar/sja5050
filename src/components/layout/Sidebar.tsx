import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  HandCoins,
  Wallet,
  ShieldCheck,
  User,
  Landmark,
  Newspaper,
  Settings,
  BarChart3,
  LogOut,
  Bell,
  GitGraph,
  FileText,
} from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { useIdCardSettings } from "@/hooks/useIdCardSettings";
import { Skeleton } from "../ui/skeleton";

const adminNavItems = [
  { to: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/users", icon: Users, label: "Users" },
  { to: "/admin/investments", icon: Landmark, label: "Investments" },
  { to: "/admin/deposits", icon: HandCoins, label: "Deposits" },
  { to: "/admin/withdrawals", icon: HandCoins, label: "Withdrawals" },
  { to: "/admin/kyc", icon: ShieldCheck, label: "KYC Toolkit" },
  { to: "/admin/plans", icon: Newspaper, label: "Plans" },
  { to: "/admin/commissions", icon: GitGraph, label: "Commissions" },
  { to: "/admin/reports", icon: BarChart3, label: "Reports" },
  { to: "/admin/audit-log", icon: FileText, label: "Audit Log" },
  { to: "/admin/system", icon: Settings, label: "System" },
];

const userNavItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/investments", icon: Landmark, label: "Investments" },
  { to: "/wallet", icon: Wallet, label: "Wallet" },
  { to: "/referrals", icon: Users, label: "Referrals" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
  { to: "/profile", icon: User, label: "Profile" },
];

const NavItem = ({ to, icon: Icon, label }: { to: string; icon: React.ElementType; label: string }) => {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== '/admin/dashboard' && to !== '/dashboard' && location.pathname.startsWith(to));

  return (
    <NavLink
      to={to}
      className={cn(
        "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <Icon className="mr-3 h-5 w-5" />
      <span>{label}</span>
    </NavLink>
  );
};

export const Sidebar = ({ className }: { className?: string }) => {
  const { isAdmin, signOut } = useAuth();
  const { data: settings, isLoading } = useIdCardSettings();
  const navItems = isAdmin ? adminNavItems : userNavItems;

  return (
    <aside className={cn("flex h-full flex-col border-r bg-background p-4", className)}>
      <div className="mb-8 flex h-10 items-center justify-center p-2">
        {isLoading ? (
          <Skeleton className="h-8 w-3/4" />
        ) : settings?.logo_url ? (
          <img src={settings.logo_url} alt={settings.company_name} className="h-full max-w-full object-contain" />
        ) : (
          <span className="text-2xl font-bold text-primary">{settings?.company_name || 'SJA Foundation'}</span>
        )}
      </div>
      <nav className="flex flex-1 flex-col space-y-1">
        {navItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>
      <div className="mt-auto">
        <button
          onClick={signOut}
          className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="mr-3 h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};