import { NavLink } from "react-router-dom";
import { BarChart3, ShieldCheck, Home, Landmark, Users, GitBranch, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";

const adminNavItems = [
  { to: "/admin", label: "Dashboard", icon: Home },
  { to: "/admin/users", label: "User Management", icon: Users },
  { to: "/admin/investments", label: "Investment Mgmt", icon: Landmark },
  { to: "/admin/withdrawals", label: "Withdrawals", icon: Banknote },
  { to: "/admin/kyc", label: "KYC Toolkit", icon: ShieldCheck },
  { to: "/admin/commissions", label: "Commission Rules", icon: GitBranch },
  { to: "/admin/reports", label: "Reporting", icon: BarChart3 },
];

export function AdminSidebar({ className }: { className?: string }) {
  return (
    <aside className={cn("flex h-full flex-col border-r bg-background p-4", className)}>
      <div className="mb-4 flex items-center p-2">
        <span className="text-sm font-semibold uppercase text-muted-foreground">Admin Portal</span>
      </div>
      <div className="mb-8 flex items-center p-2 text-2xl font-bold text-primary">
        SJA Foundation
      </div>
      <nav className="flex flex-col space-y-1">
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
      </nav>
    </aside>
  );
}