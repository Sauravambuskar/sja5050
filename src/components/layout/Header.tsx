import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "./ModeToggle";
import { useProfile } from "@/hooks/useProfile";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Header = () => {
  const { data: profile } = useProfile();
  const { count: unreadCount } = useUnreadNotifications();
  const { isAdmin } = useIsAdmin();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <header className={cn(
      "flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6",
      "md:ml-[220px] lg:ml-[280px]" // Account for sidebar width on desktop
    )}>
      {/* Mobile menu button - hidden on desktop */}
      <div className="md:hidden">
        {/* This space is reserved for the mobile menu button which is handled by Sidebar component */}
      </div>

      <div className="w-full flex-1">
        <h1 className="text-lg font-semibold">
          {getGreeting()}, {profile?.full_name || "User"}!
        </h1>
      </div>
      <div className="flex items-center gap-2">
        {!isAdmin && (
          <Link to="/notifications">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-2 w-2 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                </span>
              )}
            </Button>
          </Link>
        )}
        <ModeToggle />
        <Link to="/profile">
          <Avatar className="h-9 w-9">
            <AvatarImage src={profile?.avatar_url || "https://avatar.iran.liara.run/public"} alt="User Avatar" />
            <AvatarFallback>{profile?.full_name?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  );
};