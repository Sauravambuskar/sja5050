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

interface UserDetailsSheetProps {
  user: AdminUserView | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export const UserDetailsSheet = ({ user, isOpen, onOpenChange }: UserDetailsSheetProps) => {
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
          
          <div className="rounded-lg border bg-card p-4 text-center text-muted-foreground">
            Investment history will be displayed here.
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};