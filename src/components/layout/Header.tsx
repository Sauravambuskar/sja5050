import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Bell } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sidebar } from "./Sidebar";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { ModeToggle } from "./ModeToggle";
import { useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useUnreadNotifications } from "@/hooks/useUnreadNotifications";
import { Badge } from "@/components/ui/badge";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { AdminUserSearch } from "../admin/AdminUserSearch";
import { getGeneratedAvatarUrl } from "@/lib/utils";

export function Header({ handleViewUser }: { handleViewUser: (userId: string) => void }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);
  const { count: unreadCount } = useUnreadNotifications();
  const { isAdmin } = useIsAdmin();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    // Clear all cached data to prevent data leakage between sessions
    queryClient.clear();

    if (error && error.message !== 'Auth session missing!') {
      // Only show an error for unexpected issues.
      toast.error("Logout failed: " + error.message);
    } else {
      toast.success("You have been logged out.");
    }
    
    // Always redirect to the login page to ensure a clean state.
    navigate("/login");
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  return (
    <>
      <header className="flex h-14 items-center gap-4 border-b bg-background px-4 lg:h-[60px] lg:px-6">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="shrink-0 md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle navigation menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0">
            <Sidebar />
          </SheetContent>
        </Sheet>

        <div className="w-full flex-1">
          {isAdmin && <AdminUserSearch onUserSelect={handleViewUser} />}
        </div>

        <div className="flex items-center gap-4">
          <Link to="/notifications">
            <Button variant="outline" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full p-0">
                  {unreadCount}
                </Badge>
              )}
              <span className="sr-only">View notifications</span>
            </Button>
          </Link>
          <ModeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon" className="rounded-full">
                <Avatar>
                  <AvatarImage src={user?.user_metadata?.avatar_url || getGeneratedAvatarUrl(user?.user_metadata?.full_name)} />
                  <AvatarFallback>{getInitials(user?.user_metadata?.full_name)}</AvatarFallback>
                </Avatar>
                <span className="sr-only">Toggle user menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href="mailto:support@sja-foundation.com">Support</a>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsLogoutDialogOpen(true)} className="text-destructive focus:text-destructive">
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <AlertDialog open={isLogoutDialogOpen} onOpenChange={setIsLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to log out?</AlertDialogTitle>
            <AlertDialogDescription>
              You will be returned to the login page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}