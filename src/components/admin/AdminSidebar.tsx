import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Settings,
  FileText,
  Landmark,
  HandCoins,
  Ticket,
  History,
  Megaphone,
  Image,
} from "lucide-react";
import { NavLink } from "react-router-dom";

const links = [
  {
    href: "/admin",
    icon: LayoutDashboard,
    label: "Dashboard",
  },
  {
    href: "/admin/users",
    icon: Users,
    label: "Users",
  },
  {
    href: "/admin/investments",
    icon: Briefcase,
    label: "Investments",
  },
  {
    href: "/admin/plans",
    icon: FileText,
    label: "Plans",
  },
  {
    href: "/admin/requests",
    icon: Landmark,
    label: "Deposits",
  },
  {
    href: "/admin/withdrawals",
    icon: HandCoins,
    label: "Withdrawals",
  },
  {
    href: "/admin/support",
    icon: Ticket,
    label: "Support",
  },
  {
    href: "/admin/reports",
    icon: FileText,
    label: "Reports",
  },
  {
    href: "/admin/audit-log",
    icon: History,
    label: "Audit Log",
  },
  {
    href: "/admin/broadcast",
    icon: Megaphone,
    label: "Broadcast",
  },
  {
    href: "/admin/banners",
    icon: Image,
    label: "Banners",
  },
  {
    href: "/admin/settings",
    icon: Settings,
    label: "Settings",
  },
];

export function AdminSidebar({ className }: { className?: string }) {
  return (
    <div className={cn("pb-12", className)}>
      <div className="space-y-4 py-4">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Admin Panel
          </h2>
          <div className="space-y-1">
            {links.map((link) => (
              <NavLink
                to={link.href}
                key={link.href}
                end={link.href === "/admin"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center px-4 py-2 text-sm font-medium rounded-md hover:bg-accent hover:text-accent-foreground",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground"
                  )
                }
              >
                <link.icon className="mr-2 h-4 w-4" />
                {link.label}
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}