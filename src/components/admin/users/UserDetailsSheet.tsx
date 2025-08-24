import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { Profile } from "@/types/database";

const fetchUserProfile = async (userId: string | null): Promise<Profile | null> => {
  if (!userId) return null;
  const { data, error } = await supabase.rpc('get_user_profile_for_admin', { user_id_to_fetch: userId });
  if (error) throw new Error(error.message);
  return data[0];
};

export const UserDetailsSheet = ({ userId, isOpen, onOpenChange }: { userId: string | null; isOpen: boolean; onOpenChange: (open: boolean) => void; }) => {
  const { data: profile, isLoading } = useQuery({
    queryKey: ['userProfileForAdmin', userId],
    queryFn: () => fetchUserProfile(userId),
    enabled: !!userId,
  });

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>User Details</SheetTitle>
          <SheetDescription>
            Viewing details for {profile?.full_name || 'user'}.
          </SheetDescription>
        </SheetHeader>
        <div className="py-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : profile ? (
            <div className="space-y-2">
              <p><strong>Name:</strong> {profile.full_name}</p>
              <p><strong>Email:</strong> {/* Email is not in profile, would need to join auth.users */}</p>
              <p><strong>Phone:</strong> {profile.phone}</p>
              <p><strong>KYC Status:</strong> {profile.kyc_status}</p>
              <p><strong>Role:</strong> {profile.role}</p>
            </div>
          ) : (
            <p>Could not load user details.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};