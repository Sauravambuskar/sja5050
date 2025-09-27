import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Copy } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Skeleton } from "../ui/skeleton";

const fetchReferralCode = async () => {
  const { data, error } = await supabase.rpc('get_my_referral_code');
  if (error) throw new Error(error.message);
  return data;
};

export function ReferralCard() {
  const { data: referralCode, isLoading } = useQuery<string>({
    queryKey: ['myReferralCode'],
    queryFn: fetchReferralCode,
  });

  const copyToClipboard = () => {
    if (referralCode) {
      navigator.clipboard.writeText(referralCode);
      toast.success("Referral code copied to clipboard!");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Grow Your Network</CardTitle>
        <CardDescription>Invite friends and earn commissions on their investments.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm font-medium mb-2">Your Unique Referral Code</p>
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex-1 border rounded-md px-3 py-2 bg-muted text-muted-foreground font-mono text-sm">
                {referralCode}
              </div>
              <Button variant="outline" size="icon" onClick={copyToClipboard}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
        <Button asChild className="w-full">
          <Link to="/referrals">
            View My Referrals <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}