import { cn } from "@/lib/utils";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  DollarSign,
  Wallet,
  User,
  Users,
  Bell,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const clientNavItems = [
  { to: "/", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/investments", icon: DollarSign, label: "Investments" },
  { to: "/wallet", icon: Wallet, label: "Wallet" },
  { to: "/referrals", icon: Users, label: "Referrals" },
  { to: "/notifications", icon: Bell, label: "Notifications" },
  { to: "/profile", icon: User, label: "Profile" },
];

export const NavContent = () => {
  const { isAdmin } = useAuth();
  const navItems = isAdmin ? [] : clientNavItems;

  if (isAdmin) return null;

  return (
    <nav className="flex-1 space-y-2">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-4 rounded-lg p-3 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              isActive && "bg-primary text-primary-foreground"
            )
          }
        >
          <item.icon className="h-5 w-5" />
          <span className="font-medium">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};


export const Sidebar = ({ className }: { className?: string }) => {
  return (
    <aside className={cn("hidden h-full w-64 flex-col border-r bg-background p-4 lg:flex", className)}>
      <div className="mb-8 flex items-center p-2 text-2xl font-bold text-primary">
        SJA Foundation
      </div>
      <NavContent />
    </aside>
  );
};