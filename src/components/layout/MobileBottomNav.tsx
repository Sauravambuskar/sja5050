import { Link, useLocation } from "react-router-dom";
import { Home, TrendingUp, Wallet, Users, User } from "lucide-react";
import { cn } from "@/lib/utils";

export const MobileBottomNav = () => {
  const location = useLocation();

  const navItems = [
    { name: "Home", icon: Home, path: "/dashboard" },
    { name: "Invest", icon: TrendingUp, path: "/investments" },
    { name: "Wallet", icon: Wallet, path: "/wallet" },
    { name: "Referrals", icon: Users, path: "/referrals" },
    { name: "Profile", icon: User, path: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t lg:hidden">
      <div className="flex h-16 items-center justify-around">
        {navItems.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            className={cn(
              "flex flex-col items-center gap-1 text-xs font-medium transition-colors",
              location.pathname === item.path ? "text-primary" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.name}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};