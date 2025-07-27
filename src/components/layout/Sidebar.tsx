import { NavLink } from "react-router-dom";
import { Bell, Home, TrendingUp, User, Users, Wallet as WalletIcon, BarChart3, ShieldCheck, Landmark, GitBranch, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { Badge } from "@/components/ui/badge";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "../ui/skeleton";

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
  { to: "/admin/investments", label: "Investment Mgmt", icon: Landmark },
  { to: "/admin/withdrawals", label: "Withdrawals", icon: Banknote },
  { to: "/admin/kyc", label: "KYC Toolkit", icon: ShieldCheck },
  { to: "/admin/commissions", label: "Commission Rules", icon: GitBranch },
  { to: "/admin/reports", label: "Reporting", icon: BarChart3 },
];

export function Sidebar({ className }: { className?: string }) {
  const { count: unreadCount } = useUnreadNotifications();
  const { isAdmin, isLoading: isAdminLoading } = useIsAdmin();

  return (
    <aside className={cn("flex h-full flex-col border-r bg-background p-4", className)}>
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
          {adminNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/admin"}
              className={({ isActive }) =>
                cn(
                  "flex items-center rounded-md px-3 py-2 text-sm font-medium",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )
              }
            >
              <item.icon className="mr-3 h-5 w-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      )}
    </aside>
  );
}