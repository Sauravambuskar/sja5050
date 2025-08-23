import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Referral } from "@/types/database";
import { Skeleton } from "../ui/skeleton";
import { format } from "date-fns";

const fetchMyReferrals = async (): Promise<Referral[]> => {
  const { data, error } = await supabase.rpc('get_my_referrals');
  if (error) throw new Error(error.message);
  return data;
};

const ReferralTree = () => {
  const { data: referrals, isLoading } = useQuery<Referral[]>({
    queryKey: ['myReferrals'],
    queryFn: fetchMyReferrals,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Referrals</CardTitle>
        <CardDescription>
          A list of users you have successfully referred to the platform.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Join Date</TableHead>
              <TableHead className="text-right">KYC Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-6 w-20 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : referrals && referrals.length > 0 ? (
              referrals.map((referral) => (
                <TableRow key={referral.id}>
                  <TableCell className="font-medium">{referral.full_name}</TableCell>
                  <TableCell>{format(new Date(referral.join_date), "PPP")}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={referral.kyc_status === "Approved" ? "default" : "outline"}>
                      {referral.kyc_status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">You haven't referred anyone yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default ReferralTree;