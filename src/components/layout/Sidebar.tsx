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
} from "lucide-react";
import { NavLink } from "react-router-dom";
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

type BadgeValues = {
  pendingKyc: number;
  pendingDeposits: number;
  pendingInvestments: number;
  pendingWithdrawalsTotal: number;
  pendingCancellations: number;
  openTickets: number;
};

interface AdminNavItem {
  to: string;
  label: string;
  icon: any; // LucideIcon type
  badgeKey?: keyof BadgeValues; // This ensures badgeKey is a valid key
}

export function Sidebar({ className }: { className?: string }) {
  const { isAdmin, isLoading: isAdminLoading } = useIsAdmin();
  const { data: profile, isLoading: isProfileLoading } = useProfile();
  const { count: unreadCount } = useUnreadNotifications(); // Fix: Destructure 'count' instead of 'data'
  const { data: adminCounts } = useAdminActionCounts();

  const isLoading = isAdminLoading || isProfileLoading;

  const badgeValues: BadgeValues = {
    pendingKyc: adminCounts?.pending_kyc || 0,
    pendingDeposits: adminCounts?.pending_deposits_count || 0,
    pendingInvestments: adminCounts?.pending_investments_count || 0,
    pendingWithdrawalsTotal: (adminCounts?.pending_withdrawals_count || 0),
    pendingCancellations: adminCounts?.pending_cancellations_count || 0,
    openTickets: adminCounts?.open_tickets_count || 0, // Fix: Ensure open_tickets_count exists on AdminDashboardStats
  };

  const userNavItems = [
    { to: "/", label: "Dashboard", icon: Home },
    { to: "/investments", label: "Investments", icon: TrendingUp },
    { to: "/withdrawals", label: "Withdrawals", icon: Banknote },
    { to: "/wallet", label: "Wallet", icon: Wallet },
    { to: "/profile", label: "Profile", icon: User },
    { to: "/referrals", label: "Referrals", icon: Users },
    { to: "/payment-details", label: "Payment Details", icon: FileSpreadsheet },
    { to: "/reports", label: "Reports", icon: BarChart3 },
    { to: "/notes", label: "Notes", icon: StickyNote },
    { to: "/notifications", label: "Notifications", icon: Bell },
    { to: "/support", label: "Support", icon: MessageSquare },
    { to: "/faq", label: "FAQ", icon: HelpCircle },
  ];

  const adminNavItems: AdminNavItem[] = [
    { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/user-management", label: "Users", icon: Users },
    { to: "/admin/kyc-management", label: "KYC", icon: FileCheck, badgeKey: "pendingKyc" },
    { to: "/admin/request-management", label: "Requests", icon: ListChecks, badgeKey: "pendingDeposits" },
    { to: "/admin/investment-requests", label: "Investment Requests", icon: Briefcase },
    { to: "/admin/wallet-withdrawal-management", label: "Wallet Withdrawals", icon: WalletCards },
    { to: "/admin/investment-cancellations", label: "Cancellations", icon: Ban },
    { to: "/admin/investment-management", label: "Investment Plans", icon: ListOrdered, badgeKey: "pendingInvestments" },
    { to: "/admin/commission-rules", label: "Commission Rules", icon: Percent },
    { to: "/admin/support-desk", label: "Support Desk", icon: MessageSquareHeart },
    { to: "/admin/reports", label: "Reporting", icon: BarChart3 },
    { to: "/admin/financial-reports", label: "Financial Reports", icon: FileSpreadsheet },
    { to: "/admin/payout-reports", label: "Payout Reports", icon: FileSpreadsheet },
    { to: "/admin/master-reports", label: "Master Reports", icon: Database },
    { to: "/admin/withdrawals", label: "Withdrawals", icon: Landmark, badgeKey: "pendingWithdrawalsTotal" },
    { to: "/admin/faqs", label: "FAQ Management", icon: HelpCircle },
    { to: "/admin/audit-log", label: "Audit Log", icon: FileClock },
    { to: "/admin/system", label: "System", icon: ServerCog },
  ];

  return (
    <aside className={`flex h-full w-[256px] flex-col border-r bg-background p-4 ${className}`}>
      <div className="mb-8 flex h-10 items-center p-2">
        <img 
          src="https://i.ibb.co/nNKNZvFP/Untitled-design.png" 
          alt="Company Logo" 
          className="h-100 w-auto object-contain" 
        />
      </div>
      <nav className="flex flex-col space-y-1">
        {userNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )
            }
          >
            <div className="flex items-center">
              <item.icon className="mr-3 h-5 w-5" />
              <span>{item.label}</span>
            </div>
            {item.label === "Notifications" && unreadCount > 0 && (
              <Badge className="flex h-5 w-5 items-center justify-center rounded-full p-0">
                {unreadCount}
              </Badge>
            )}
          </NavLink>
        ))}
      </nav>

      {isLoading && (
        <div className="mt-auto flex flex-col space-y-1">
          <Separator className="my-4" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      )}

      {isAdmin && (
        <div className="mt-auto flex flex-col space-y-1">
          <Separator className="my-4" />
          <div className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">
            Admin Portal
          </div>
          {adminNavItems.map((item) => {
            const badgeCount = item.badgeKey ? badgeValues[item.badgeKey] : 0;

            // This part is for non-collapsible items
            if (!item.to) return null;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/admin"}
                className={({ isActive: navIsActive }) =>
                  cn(
                    "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium",
                    navIsActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )
                }
              >
                <div className="flex items-center">
                  <item.icon className="mr-3 h-5 w-5" />
                  <span>{item.label}</span>
                </div>
                {badgeCount > 0 && (
                  <Badge className="flex h-5 w-5 items-center justify-center rounded-full p-0">
                    {badgeCount}
                  </Badge>
                )}
              </NavLink>
            );
          })}
        </div>
      )}
    </aside>
  );
};