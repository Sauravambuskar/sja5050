import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "./ModeToggle";
import { useProfile } from "@/hooks/useProfile";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";

export const Header = () => {
  const { data: profile } = useProfile();
  const { count: unreadCount } = useUnreadNotifications();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <header className="flex items-center justify-between p-4 border-b bg-card lg:hidden">
      <div className="flex items-center gap-3">
        <Avatar className="h-9 w-9">
          <AvatarImage src={profile?.avatar_url || "https://avatar.iran.liara.run/public"} alt="User Avatar" />
          <AvatarFallback>{profile?.full_name?.charAt(0) || 'U'}</AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-medium">{getGreeting()}, {profile?.full_name?.split(' ')[0] || 'User'}</p>
          <p className="text-xs text-muted-foreground">Today {new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative">
          <Search className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" className="relative" asChild>
          <Link to="/notifications">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-3 w-3 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                {/* {unreadCount} */}
              </span>
            )}
          </Link>
        </Button>
        <ModeToggle />
      </div>
    </header>
  );
};