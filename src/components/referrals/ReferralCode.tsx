import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "../ui/skeleton";

const fetchReferralCode = async () => {
  const { data, error } = await supabase.rpc('get_my_referral_code');
  if (error) throw new Error(error.message);
  return data;
};

const ReferralCode = () => {
  const { data: referralCode, isLoading } = useQuery<string>({
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
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-10" />
          </div>
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