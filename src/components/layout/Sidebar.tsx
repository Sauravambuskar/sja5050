import { NavLink } from "react-router-dom";
import { Bell, Home, TrendingUp, User, Users, Wallet as WalletIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { Badge } from "@/components/ui/badge";

const navItems = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/investments", label: "Investments", icon: TrendingUp },
  { to: "/wallet", label: "Wallet", icon: WalletIcon },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/referrals", label: "Referrals", icon: Users },
  { to: "/notifications", label: "Notifications", icon: Bell },
];

export function Sidebar({ className }: { className?: string }) {
  const { count: unreadCount } = useUnreadNotifications();

  return (
    <aside className={cn("flex h-full flex-col border-r bg-background p-4", className)}>
      <div className="mb-8 flex items-center p-2 text-2xl font-bold text-primary">
        SJA Foundation
      </div>
      <nav className="flex flex-col space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end
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
    </aside>
  );
}