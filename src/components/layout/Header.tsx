import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bell, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModeToggle } from "./ModeToggle";
import { useProfile } from "@/hooks/useProfile";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Sidebar } from "./Sidebar";
import { useState } from "react";
import { AppLogo } from "@/components/branding/AppLogo";

export const Header = () => {
  const { data: profile } = useProfile();
  const { count: unreadCount } = useUnreadNotifications();
  const [isSheetOpen, setSheetOpen] = useState(false);

  return (
    <header className="flex h-14 items-center gap-3 border-b bg-background px-4 lg:h-[60px] lg:px-6">
      <Sheet open={isSheetOpen} onOpenChange={setSheetOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0 md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle navigation menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col p-0">
          <Sidebar onNavigate={() => setSheetOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Brand (all screen sizes) */}
      <Link to="/" className="flex items-center gap-2">
        <AppLogo className="h-7 max-w-[140px]" alt="App logo" />
      </Link>

      <div className="w-full flex-1" />

      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative" asChild>
          <Link to="/notifications">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-2 w-2 items-center justify-center rounded-full bg-red-500 text-xs text-white" />
            )}
          </Link>
        </Button>
        <ModeToggle />
        <Link to="/profile">
          <Avatar className="h-9 w-9">
            <AvatarImage src={profile?.avatar_url || "https://avatar.iran.liara.run/public"} alt="User Avatar" />
            <AvatarFallback>{profile?.full_name?.charAt(0) || "U"}</AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </header>
  );
};