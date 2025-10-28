import {
  Bell,
  Home,
  TrendingUp,
  User,
  Users,
  Wallet,
  FileText,
  LifeBuoy,
  Settings,
  FileQuestion,
  Newspaper,
  UserCog,
  BarChart3,
  GanttChartSquare,
  History,
  HandCoins,
  Receipt,
  Building2,
  ShieldCheck,
  Send,
  BookUser,
  UserRoundCog,
  UserRoundSearch,
  FilePieChart,
  BookCheck,
  FileKey2,
  FileDigit,
  FileStack,
  UserSquare,
  Banknote,
  FileSpreadsheet,
  StickyNote,
  MessageSquare,
  HelpCircle,
  LayoutDashboard,
  ArrowDownToDot,
  Briefcase,
  WalletCards,
  Ban,
  ListOrdered,
  Percent,
  MessageSquareHeart,
  Database,
  Landmark,
  FileClock,
  ServerCog,
  FileCheck,
  ListChecks,
  FileSignature,
  GitPullRequest,
  Headset,
  LogOut,
  BookOpen,
} from "lucide-react";
import { NavLink, Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useProfile } from "@/hooks/useProfile";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "../ui/skeleton";
import { useAdminActionCounts } from "@/hooks/useAdminActionCounts";
import { useIdCardSettings } from "@/hooks/useIdCardSettings";
import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface SidebarProps {
  onNavigate?: () => void;
}

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
  countKey?: string;
}

const userNavItems: NavItem[] = [
  { to: "/", icon: Home, label: "Dashboard" },
  { to: "/investments", icon: TrendingUp, label: "Investments" },
  { to: "/wallet", icon: Wallet, label: "Wallet" },
  { to: "/referrals", icon: Users, label: "Referrals" },
  { to: "/reports", icon: BarChart3, label: "Reports" },
  { to: "/payments", icon: Receipt, label: "Payment History" },
  { to: "/payment-details", icon: Banknote, label: "Payment Details" },
  { to: "/agreement", icon: FileSignature, label: "Agreement" },
  { to: "/support", icon: LifeBuoy, label: "Support" },
  { to: "/faq", icon: HelpCircle, label: "FAQ" },
];

const adminNavItems: NavItem[] = [
  { to: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/admin/user-management", icon: Users, label: "Users" },
  { to: "/admin/request-management", icon: GitPullRequest, label: "Requests", countKey: 'total' },
  { to: "/admin/investment-management", icon: Briefcase, label: "Investments" },
  { to: "/admin/investment-requests", icon: FileCheck, label: "Approve Investment Req" },
  { to: "/admin/kyc-management", icon: ShieldCheck, label: "KYC", countKey: 'kyc' },
  { to: "/admin/support-desk", icon: Headset, label: "Support", countKey: 'support' },
  { to: "/admin/commission-rules", icon: Percent, label: "Commissions" },
  { to: "/admin/reporting", icon: BarChart3, label: "Analytics" },
  { to: "/admin/ledger", icon: BookOpen, label: "Ledger" },
  { to: "/admin/payout-reports", icon: FileSpreadsheet, label: "Payouts" },
  { to: "/admin/payments", icon: Receipt, label: "Payment History" },
  { to: "/admin/master-reports", icon: Database, label: "Master Reports" },
  { to: "/admin/faq-management", icon: HelpCircle, label: "FAQ" },
  { to: "/admin/audit-log", icon: History, label: "Audit Log" },
  { to: "/admin/system-management", icon: Settings, label: "System" },
];

export function Sidebar({ onNavigate }: SidebarProps) {
  const { isAdmin } = useIsAdmin();
  const { count: unreadNotifications } = useUnreadNotifications();
  const { data: adminCounts } = useAdminActionCounts();
  const { revertImpersonation } = useAuth();

  const navItems = isAdmin ? adminNavItems : userNavItems;

  const getCount = (key?: string) => {
    if (!key || !isAdmin) return 0;
    return adminCounts?.[key as keyof typeof adminCounts] || 0;
  }

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        toast.error('Failed to logout. Please try again.');
      } else {
        toast.success('Logged out successfully');
        if (onNavigate) {
          onNavigate();
        }
      }
    } catch (error) {
      toast.error('An error occurred during logout.');
    }
  };

  return (
    <aside className="flex h-full max-h-screen flex-col gap-2 border-r bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold" onClick={onNavigate}>
          <img src="https://i.ibb.co/nNKNZvFP/Untitled-design.png" alt="SJA Logo" className="h-8 w-auto" />
          <span className="">SJA</span>
        </Link>
        {!isAdmin && (
          <Link to="/notifications" className="ml-auto" onClick={onNavigate}>
            <Button variant="outline" size="icon" className="h-8 w-8 relative">
              <Bell className="h-4 w-4" />
              {unreadNotifications > 0 && (
                <Badge className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full p-0 text-xs">
                  {unreadNotifications}
                </Badge>
              )}
              <span className="sr-only">Toggle notifications</span>
            </Button>
          </Link>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
          {navItems.map((item) => {
            const count = getCount(item.countKey);
            return (
              <NavLink
                key={item.label}
                to={item.to}
                end={item.to === "/admin" || item.to === "/"}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sidebar-foreground transition-all hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isActive && "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground"
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {count > 0 && (
                  <Badge className="ml-auto flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                    {count}
                  </Badge>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Logout Button at Bottom */}
      <div className="p-4 border-t">
        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Logout
        </Button>
      </div>
    </aside>
  );
}