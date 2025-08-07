import { NavLink } from "react-router-dom";
import { Bell, Home, TrendingUp, User, Users, Wallet as WalletIcon, BarChart3, ShieldCheck, Landmark, GitBranch, Banknote, FileClock, ServerCog, ArrowDownToDot, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { Badge } from "@/components/ui/badge";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "../ui/skeleton";
import { useAdminActionCounts } from "@/hooks/useAdminActionCounts";

const userNavItems = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/investments", label: "Investments", icon: TrendingUp },
  { to: "/wallet", label: "Wallet", icon: WalletIcon },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/referrals", label: "Referrals", icon: Users },
  { to: "/notifications", label: "Notifications", icon: Bell },
];

const adminNavItems = [
  { to: "/admin", label: "Admin Dashboard", icon: Home },
  { to: "/admin/users", label: "User Management", icon: Users },
  { to: "/admin/deposits", label: "Deposits", icon: ArrowDownToDot },
  { to: "/admin/withdrawals", label: "Withdrawals", icon: Banknote },
  { to: "/admin/investments", label: "Investment Mgmt", icon: Landmark },
  { to: "/admin/kyc", label: "KYC Toolkit", icon: ShieldCheck },
  { to: "/admin/commissions", label: "Commission Rules", icon: GitBranch },
  { to: "/admin/reports", label: "Reporting", icon: BarChart3 },
  { to: "/admin/payout-reports", label: "Payout Reports", icon: FileSpreadsheet },
  { to: "/admin/audit-log", label: "Audit Log", icon: FileClock },
  { to: "/admin/system", label: "System", icon: ServerCog },
];

export function Sidebar({ className }: { className?: string }) {
  const { count: unreadCount } = useUnreadNotifications();
  const { isAdmin, isLoading: isAdminLoading } = useIsAdmin();
  const { pendingKycCount, pendingWithdrawalsCount, pendingDepositsCount } = useAdminActionCounts();

  return (
    <aside className={cn("flex h-full flex-col border-r bg-background p-4", className)}>
      <div>
        <div className="mb-8 flex items-center p-2 text-2xl font-bold text-primary">
          SJA Foundation
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
      </div>

      <div className="mt-auto">
        {isAdminLoading && (
          <div className="flex flex-col space-y-1">
            <Separator className="my-4" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        )}

        {isAdmin && (
          <div className="flex flex-col space-y-1">
            <Separator className="my-4" />
            <div className="mb-2 px-3 text-xs font-semibold uppercase text-muted-foreground">
              Admin Portal
            </div>
            {adminNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/admin"}
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
                {item.label === "KYC Toolkit" && pendingKycCount > 0 && (
                  <Badge className="flex h-5 w-5 items-center justify-center rounded-full p-0">
                    {pendingKycCount}
                  </Badge>
                )}
                {item.label === "Withdrawals" && pendingWithdrawalsCount > 0 && (
                  <Badge className="flex h-5 w-5 items-center justify-center rounded-full p-0">
                    {pendingWithdrawalsCount}
                  </Badge>
                )}
                {item.label === "Deposits" && pendingDepositsCount > 0 && (
                  <Badge className="flex h-5 w-5 items-center justify-center rounded-full p-0">
                    {pendingDepositsCount}
                  </Badge>
                )}
              </NavLink>
            ))}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-border text-center text-xs text-muted-foreground">
          Version 8.1
        </div>
      </div>
    </aside>
  );
}