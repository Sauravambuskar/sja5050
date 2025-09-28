import { NavLink } from "react-router-dom";
import { Home, TrendingUp, Wallet, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { Badge } from "../ui/badge";

const navItems = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/investments", icon: TrendingUp, label: "Invest" },
  { to: "/wallet", icon: Wallet, label: "Wallet" },
  { to: "/referrals", icon: Users, label: "Referrals" },
  { to: "/profile", icon: User, label: "Profile" },
];

export const MobileBottomNav = () => {
  const { count: unreadCount } = useUnreadNotifications();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur-sm md:hidden">
      <div className="grid h-16 grid-cols-5">
        {navItems.map((item) => (
          <NavLink
            key={item.label}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              cn(
                "relative flex flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground transition-colors",
                isActive && "text-primary"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
            {item.to === "/notifications" && unreadCount > 0 && (
              <Badge className="absolute top-1 right-4 flex h-4 w-4 items-center justify-center rounded-full p-0 text-xs">
                {unreadCount}
              </Badge>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};