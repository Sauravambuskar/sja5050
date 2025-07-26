import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";
import { Copy } from "lucide-react";
import { toast } from "sonner";

const fetchReferralCode = async (): Promise<string> => {
  const { data, error } = await supabase.rpc('get_my_referral_code');
  if (error) {
    throw new Error(error.message);
  }
  return data;
};

const ReferralCode = () => {
  const { data: referralCode, isLoading, isError } = useQuery<string>({
    queryKey: ['myReferralCode'],
    queryFn: fetchReferralCode,
  });

  const handleCopy = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode);
    toast.success("Referral code copied to clipboard!");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Referral Code</CardTitle>
        <CardDescription>Share this code with others to invite them to the platform.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex w-full max-w-sm items-center space-x-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-10" />
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive">Could not load your referral code.</p>
        ) : (
          <div className="flex w-full max-w-sm items-center space-x-2">
            <Input type="text" value={referralCode || "Not available"} readOnly />
            <Button type="button" size="icon" onClick={handleCopy} disabled={!referralCode}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReferralCode;