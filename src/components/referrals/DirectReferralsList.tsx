import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Referral } from "@/types/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { CheckCircle, XCircle } from "lucide-react";

const fetchMyReferrals = async (): Promise<Referral[]> => {
  const { data, error } = await supabase.rpc('get_my_referrals');
  if (error) throw new Error(error.message);
  return data;
};

const DirectReferralsList = () => {
  const { data: referrals, isLoading } = useQuery<Referral[]>({
    queryKey: ['myDirectReferrals'],
    queryFn: fetchMyReferrals,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Direct Referrals</CardTitle>
        <CardDescription>A list of users who signed up directly using your code.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Full Name</TableHead>
                <TableHead>Join Date</TableHead>
                <TableHead>KYC Status</TableHead>
                <TableHead className="text-center">Has Invested</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell className="text-center"><Skeleton className="h-6 w-6 mx-auto rounded-full" /></TableCell>
                  </TableRow>
                ))
              ) : referrals && referrals.length > 0 ? (
                referrals.map((ref) => (
                  <TableRow key={ref.id}>
                    <TableCell className="font-medium">{ref.full_name}</TableCell>
                    <TableCell>{format(new Date(ref.join_date), "PPP")}</TableCell>
                    <TableCell>
                      <Badge variant={ref.kyc_status === "Approved" ? "default" : "outline"}>
                        {ref.kyc_status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {ref.has_invested ? (
                        <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <XCircle className="h-5 w-5 text-muted-foreground mx-auto" />
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    You have no direct referrals yet.
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

export default DirectReferralsList;