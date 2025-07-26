import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { AdminUserView, AdminUserInvestmentHistoryItem } from "@/types/database";
import { Separator } from "@/components/ui/separator";
import { Badge } from "../ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Skeleton } from "../ui/skeleton";
import { format } from "date-fns";

interface UserDetailsSheetProps {
  user: AdminUserView | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const fetchUserInvestmentHistory = async (userId: string): Promise<AdminUserInvestmentHistoryItem[]> => {
  const { data, error } = await supabase.rpc('get_user_investment_history_for_admin', {
    user_id_to_fetch: userId,
  });
  if (error) throw new Error(error.message);
  return data;
};

export const UserDetailsSheet = ({ user, isOpen, onOpenChange }: UserDetailsSheetProps) => {
  const { data: investments, isLoading } = useQuery({
    queryKey: ['userInvestmentHistory', user?.id],
    queryFn: () => fetchUserInvestmentHistory(user!.id),
    enabled: !!user && isOpen, // Only fetch when the sheet is open and a user is selected
  });

  if (!user) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{user.full_name || "User Details"}</SheetTitle>
          <SheetDescription>
            A complete overview of the user's account and activity.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-6 space-y-6">
          <div>
            <h3 className="font-semibold text-foreground">Account Information</h3>
            <Separator className="my-2" />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span>{user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Joined:</span>
                <span>{new Date(user.join_date).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">KYC Status:</span>
                <Badge variant={user.kyc_status === "Approved" ? "default" : "outline"}>
                  {user.kyc_status}
                </Badge>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-foreground">Financials</h3>
            <Separator className="my-2" />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Wallet Balance:</span>
                <span className="font-mono">₹{user.wallet_balance.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
          
          <div>
            <h3 className="font-semibold text-foreground">Investment History</h3>
            <Separator className="my-2" />
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    [...Array(2)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell className="text-right"><Skeleton className="h-4 w-16" /></TableCell>
                      </TableRow>
                    ))
                  ) : investments && investments.length > 0 ? (
                    investments.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell>
                          <div className="font-medium">{inv.plan_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(inv.start_date), "PPP")}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          ₹{inv.investment_amount.toLocaleString('en-IN')}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={2} className="h-24 text-center">
                        No investments found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};