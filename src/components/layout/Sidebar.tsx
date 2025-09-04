import { NavLink, useLocation } from "react-router-dom";
import { Bell, Home, TrendingUp, User, Users, Wallet as WalletIcon, BarChart3, ShieldCheck, Landmark, GitBranch, Banknote, FileClock, ServerCog, ArrowDownToDot, FileSpreadsheet, HelpCircle, MessageSquare, Database, ChevronRight, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { Badge } from "@/components/ui/badge";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "../ui/skeleton";
import { useAdminActionCounts } from "@/hooks/useAdminActionCounts";
import { useIdCardSettings } from "@/hooks/useIdCardSettings";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import React from "react";

const userNavItems = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/investments", label: "Investments", icon: TrendingUp },
  { to: "/withdrawals", label: "Withdrawals", icon: Banknote },
  { to: "/wallet", label: "Wallet", icon: WalletIcon },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/referrals", label: "Referrals", icon: Users },
  { to: "/payment-details", label: "Payment Details", icon: FileSpreadsheet },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/support", label: "Support", icon: MessageSquare },
  { to: "/faq", label: "FAQ", icon: HelpCircle },
];

const adminNavItems = [
  { to: "/admin", label: "Admin Dashboard", icon: Home },
  { to: "/admin/users", label: "User Management", icon: Users },
  { to: "/admin/requests", label: "Requests", icon: ArrowDownToDot, badgeKey: "pendingRequestsCount" },
  {
    label: "Withdrawals",
    icon: Landmark,
    badgeKey: "pendingWithdrawalsTotal",
    subItems: [
      { to: "/admin/withdrawals?status=Pending", label: "Pending Withdrawals", badgeKey: "pendingWithdrawalsTotal" },
      { to: "/admin/withdrawals?status=Approved", label: "Approved Withdrawals" },
      { to: "/admin/withdrawals?status=Rejected", label: "Rejected Withdrawals" },
      { to: "/admin/withdrawals", label: "All Withdrawals" },
    ]
  },
  { to: "/admin/investment-requests", label: "Investment Approvals", icon: Banknote },
  { to: "/admin/investments", label: "Investment Mgmt", icon: Landmark },
  { to: "/admin/kyc", label: "KYC Toolkit", icon: ShieldCheck, badgeKey: "pendingKycCount" },
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
    pendingKycCount, 
    pendingRequestsCount,
    openTicketsCount,
    pendingWithdrawalsTotal,
  } = useAdminActionCounts();
  const { isLoading: isSettingsLoading } = useIdCardSettings();
  const location = useLocation();
  const [openCollapsible, setOpenCollapsible] = React.useState("");

  React.useEffect(() => {
    const activeParent = adminNavItems.find(item => item.subItems?.some(sub => location.pathname + location.search === sub.to || location.pathname === sub.to.split('?')[0]));
    if (activeParent) {
      setOpenCollapsible(activeParent.label);
    }
  }, [location.pathname, location.search]);

  const adminBadges: { [key: string]: number } = {
    pendingKycCount,
    pendingRequestsCount,
    openTicketsCount,
    pendingWithdrawalsTotal,
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
            key={item.to}
            to={item.to}
            end={item.to === "/"}
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

            if (item.subItems) {
              const isParentActive = item.subItems.some(sub => location.pathname + location.search === sub.to);
              return (
                <Collapsible
                  key={item.label}
                  open={openCollapsible === item.label}
                  onOpenChange={() => setOpenCollapsible(openCollapsible === item.label ? "" : item.label)}
                >
                  <CollapsibleTrigger className="w-full">
                    <div className={cn(
                      "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium w-full",
                      isParentActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}>
                      <div className="flex items-center">
                        <item.icon className="mr-3 h-5 w-5" />
                        <span>{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {badgeCount > 0 && (
                          <Badge className="flex h-5 w-5 items-center justify-center rounded-full p-0">
                            {badgeCount}
                          </Badge>
                        )}
                        <ChevronRight className={cn("h-4 w-4 transition-transform", openCollapsible === item.label && "rotate-90")} />
                      </div>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="py-1 pl-8">
                    <div className="flex flex-col space-y-1">
                      {item.subItems.map(subItem => {
                        const subBadgeCount = subItem.badgeKey ? adminBadges[subItem.badgeKey] : 0;
                        const isActive = location.pathname + location.search === subItem.to;
                        return (
                          <NavLink
                            key={subItem.to}
                            to={subItem.to}
                            onClick={onLinkClick}
                            className={cn(
                              "flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium",
                              isActive
                                ? "bg-primary text-primary-foreground"
                                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            )}
                          >
                            <div className="flex items-center">
                              <Circle className="mr-3 h-2 w-2 fill-current" />
                              <span>{subItem.label}</span>
                            </div>
                            {subBadgeCount > 0 && (
                              <Badge variant="secondary" className="h-5 px-1.5">{subBadgeCount}</Badge>
                            )}
                          </NavLink>
                        )
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )
            }

            // This part is for non-collapsible items
            if (!item.to) return null;
            const isActive = location.pathname === item.to;
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