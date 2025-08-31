import { NavLink } from "react-router-dom";
import { Bell, Home, TrendingUp, User, Users, BarChart3, ShieldCheck, Landmark, GitBranch, FileClock, ServerCog, ArrowDownToDot, FileSpreadsheet, HelpCircle, MessageSquare, Database, TrendingDown, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useAdminActionCounts } from "@/hooks/useAdminActionCounts";
import { useIdCardSettings } from "@/hooks/useIdCardSettings";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const userNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/investments', label: 'Investments', icon: TrendingUp },
  { href: '/referrals', label: 'Referrals', icon: Users },
  { href: '/wallet', label: 'Wallet', icon: Wallet },
  { href: '/payment-details', label: 'Payment Details', icon: FileSpreadsheet },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/notifications', label: 'Notifications', icon: Bell },
  { href: '/support', label: 'Support', icon: MessageSquare },
  { href: '/faq', label: 'FAQ', icon: HelpCircle },
];

const adminNavItems = [
  { to: "/admin", label: "Admin Dashboard", icon: Home },
  { to: "/admin/users", label: "User Management", icon: Users },
  { to: "/admin/investment-requests", label: "Investment Approvals", icon: TrendingUp, badgeKey: "pendingInvestmentsCount" },
  { to: "/admin/investments", label: "Investment Mgmt", icon: Landmark },
  { to: "/admin/support", label: "Support Desk", icon: MessageSquare, badgeKey: "openTicketsCount" },
  { to: "/admin/commissions", label: "Commission Rules", icon: GitBranch },
  { to: "/admin/reports", label: "Reporting", icon: BarChart3 },
  { to: "/admin/financial-reports", label: "Financial Reports", icon: FileSpreadsheet },
  { to: "/admin/payout-reports", label: "Payout Reports", icon: FileSpreadsheet },
  { to: "/admin/master-reports", label: "Master Reports", icon: Database },
  { to: "/admin/faqs", label: "FAQ Management", icon: HelpCircle },
  { to: "/admin/audit-log", label: "Audit Log", icon: FileClock },
  { to: "/admin/system", label: "System", icon: ServerCog },
];

interface SidebarProps {
  onLinkClick?: () => void;
}

export function Sidebar({ onLinkClick }: SidebarProps) {
  const { count: unreadCount } = useUnreadNotifications();
  const { isAdmin, isLoading: isAdminLoading } = useIsAdmin();
  const { 
    pendingInvestmentsCount,
    openTicketsCount,
  } = useAdminActionCounts();
  const { settings, isLoading: isSettingsLoading } = useIdCardSettings();

  const adminBadges: { [key: string]: number } = {
    pendingInvestmentsCount,
    openTicketsCount,
  };

  return (
    <aside className="flex h-full w-[256px] flex-col border-r bg-background p-4">
      <div className="mb-8 flex h-10 items-center p-2">
        {isSettingsLoading ? (
          <Skeleton className="h-10 w-50" />
        ) : (
          <img 
            src="https://i.ibb.co/nNKNZvFP/Untitled-design.png" 
            alt="Company Logo" 
            className="h-100 w-auto object-contain" 
          />
        )}
      </div>
      <nav className="flex flex-col space-y-1">
        {userNavItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === "/"}
            onClick={onLinkClick}
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

      {isAdminLoading && (
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
            const badgeCount = item.badgeKey ? adminBadges[item.badgeKey] : 0;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/admin"}
                onClick={onLinkClick}
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