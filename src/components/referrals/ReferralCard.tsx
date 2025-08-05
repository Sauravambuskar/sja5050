import { ReferralTreeUser } from "@/types/database";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const getInitials = (name: string | null | undefined) => {
  if (!name) return "U";
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
};

export const ReferralCard = ({ referral }: { referral: ReferralTreeUser }) => {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <Avatar className="h-12 w-12 text-lg bg-muted">
          <AvatarFallback>{getInitials(referral.full_name)}</AvatarFallback>
        </Avatar>
        <div className="flex-grow overflow-hidden">
          <p className="font-semibold truncate">{referral.full_name}</p>
          <p className="text-sm text-muted-foreground">Level {referral.level} Referral</p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <Badge variant={referral.kyc_status === "Approved" ? "default" : "outline"}>
                {referral.kyc_status}
            </Badge>
            <Badge variant={referral.has_invested ? "default" : "outline"}>
                {referral.has_invested ? "Invested" : "Not Invested"}
            </Badge>
        </div>
      </CardContent>
    </Card>
  );
};