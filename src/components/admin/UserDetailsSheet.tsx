import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { AdminUserView } from "@/types/database";
import { Separator } from "@/components/ui/separator";
import { Badge } from "../ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "../ui/skeleton";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminUserProfileTab } from "@/components/admin/tabs/AdminUserProfileTab";
import { AdminUserTransactionsTab } from "@/components/admin/tabs/AdminUserTransactionsTab";
import { AdminUserInvestmentsTab } from "@/components/admin/tabs/AdminUserInvestmentsTab";
import { AdminUserReferralsTab } from "@/components/admin/tabs/AdminUserReferralsTab";
import { AdminWalletAdjustmentTab } from "@/components/admin/tabs/AdminWalletAdjustmentTab";

interface UserDetailsSheetProps {
  userId: string | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onViewUser: (userId: string) => void;
}

const fetchUserDetails = async (userId: string): Promise<AdminUserView> => {
  const { data, error } = await supabase.rpc('get_all_users_details', {
    search_text: userId,
    kyc_status_filter: null,
    account_status_filter: null,
    page_limit: 1,
    page_offset: 0
  });
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("User not found.");
  return data[0];
};

export const UserDetailsSheet = ({ userId, isOpen, onOpenChange, onViewUser }: UserDetailsSheetProps) => {
  const { data: user, isLoading: isUserLoading } = useQuery({
    queryKey: ['userDetails', userId],
    queryFn: () => fetchUserDetails(userId!),
    enabled: !!userId && isOpen,
  });

  const renderContent = () => {
    if (isUserLoading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    if (!user || !userId) return <div className="p-8 text-center text-muted-foreground">User not found or ID is missing.</div>;

    return (
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-foreground">Account Information</h3>
          <Separator className="my-2" />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Email:</span><span>{user.email}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Joined:</span><span>{new Date(user.join_date).toLocaleDateString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">KYC Status:</span><Badge variant={user.kyc_status === "Approved" ? "default" : "outline"}>{user.kyc_status}</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Wallet Balance:</span><span className="font-mono">₹{user.wallet_balance.toLocaleString('en-IN')}</span></div>
          </div>
        </div>
        <Tabs defaultValue="profile">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="investments">Investments</TabsTrigger>
            <TabsTrigger value="referrals">Referrals</TabsTrigger>
            <TabsTrigger value="adjust">Adjust Wallet</TabsTrigger>
          </TabsList>
          <TabsContent value="profile" className="mt-4"><AdminUserProfileTab userId={userId} onViewUser={onViewUser} /></TabsContent>
          <TabsContent value="transactions" className="mt-4"><AdminUserTransactionsTab userId={userId} /></TabsContent>
          <TabsContent value="investments" className="mt-4"><AdminUserInvestmentsTab userId={userId} /></TabsContent>
          <TabsContent value="referrals" className="mt-4"><AdminUserReferralsTab userId={userId} onViewUser={onViewUser} /></TabsContent>
          <TabsContent value="adjust" className="mt-4"><AdminWalletAdjustmentTab userId={userId} user={user} /></TabsContent>
        </Tabs>
      </div>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl w-full overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isUserLoading ? <Skeleton className="h-6 w-40" /> : user?.full_name || "User Details"}</SheetTitle>
          <SheetDescription>A complete overview of the user's account and activity.</SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          {renderContent()}
        </div>
      </SheetContent>
    </Sheet>
  );
};