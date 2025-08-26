import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Home, Package, Landmark, ArrowLeftRight, Users, Settings, ShieldCheck, BarChart3, FileText, MessageSquare } from "lucide-react";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useTranslation } from "react-i18next";

export function Sidebar({ onLinkClick }: { onLinkClick?: () => void }) {
  const location = useLocation();
  const { isAdmin } = useIsAdmin();
  const { t } = useTranslation();

  const mainNavLinks = [
    { to: "/", icon: Home, label: t('sidebar.dashboard') },
    { to: "/investments", icon: Package, label: t('sidebar.investments') },
    { to: "/wallet", icon: Landmark, label: t('sidebar.wallet') },
    { to: "/withdrawals", icon: ArrowLeftRight, label: t('sidebar.withdrawals') },
    { to: "/referrals", icon: Users, label: t('sidebar.referrals') },
  ];
  
  const adminNavLinks = [
    { to: "/admin/dashboard", icon: Home, label: t('sidebar.admin_dashboard') },
    { to: "/admin/users", icon: Users, label: t('sidebar.user_management') },
    { to: "/admin/requests", icon: FileText, label: t('sidebar.request_management') },
    { to: "/admin/investments", icon: Package, label: "Investment Mgt" },
    { to: "/admin/kyc", icon: ShieldCheck, label: "KYC Management" },
    { to: "/admin/reports", icon: BarChart3, label: "Reporting" },
    { to: "/admin/support", icon: MessageSquare, label: "Support Desk" },
    { to: "/admin/system", icon: Settings, label: "System" },
  ];

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/";
    return location.pathname.startsWith(path);
  };

  const links = isAdmin ? adminNavLinks : mainNavLinks;

  return (
    <div className="flex h-full max-h-screen flex-col gap-2">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link to="/" className="flex items-center gap-2 font-semibold">
          <Package className="h-6 w-6" />
          <span className="">SJA Foundation</span>
        </Link>
      </div>
      <div className="flex-1">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={onLinkClick}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                isActive(link.to) && "bg-muted text-primary"
              )}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}