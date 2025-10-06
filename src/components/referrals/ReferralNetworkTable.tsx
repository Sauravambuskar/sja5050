import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ReferralNetworkMember } from "@/types/database";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const fetchReferralNetwork = async () => {
  const { data, error } = await supabase.rpc('get_my_referral_network_flat');
  if (error) {
    throw new Error(error.message);
  }
  return data as ReferralNetworkMember[];
};

const ReferralNetworkTable = () => {
  const { data: referrals, isLoading, isError, error } = useQuery<ReferralNetworkMember[]>({
    queryKey: ['myReferralNetwork'],
    queryFn: fetchReferralNetwork,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Referral Network</CardTitle>
        <CardDescription>A complete list of all users in your downline.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sr. No.</TableHead>
                <TableHead>DOJ</TableHead>
                <TableHead>Distributor ID</TableHead>
                <TableHead>Distributor Name</TableHead>
                <TableHead>Sponsor ID</TableHead>
                <TableHead>Sponsor Name</TableHead>
                <TableHead>City</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-destructive">
                    Error: {error.message}
                  </TableCell>
                </TableRow>
              ) : referrals && referrals.length > 0 ? (
                referrals.map((referral, index) => (
                  <TableRow key={referral.user_id}>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{format(new Date(referral.join_date), "dd-MM-yyyy")}</TableCell>
                    <TableCell>{referral.member_id}</TableCell>
                    <TableCell>{referral.full_name}</TableCell>
                    <TableCell>{referral.sponsor_member_id}</TableCell>
                    <TableCell>{referral.sponsor_full_name}</TableCell>
                    <TableCell>{referral.city || 'N/A'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center">
                    You have not referred anyone yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReferralNetworkTable;