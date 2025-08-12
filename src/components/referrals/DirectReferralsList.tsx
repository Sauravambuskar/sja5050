import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Referral } from "@/types/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { CheckCircle, XCircle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const fetchMyReferrals = async (): Promise<Referral[]> => {
  const { data, error } = await supabase.rpc('get_my_referrals');
  if (error) throw new Error(error.message);
  return data;
};

const DirectReferralsList = () => {
  const isMobile = useIsMobile();
  const { data: referrals, isLoading } = useQuery<Referral[]>({
    queryKey: ['myDirectReferrals'],
    queryFn: fetchMyReferrals,
  });

  const renderDesktopView = () => (
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
  );

  const renderMobileView = () => (
    <div className="space-y-4">
      {isLoading ? (
        [...Array(2)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)
      ) : referrals && referrals.length > 0 ? (
        referrals.map((ref) => (
          <Card key={ref.id}>
            <CardHeader>
              <CardTitle>{ref.full_name}</CardTitle>
              <CardDescription>Joined: {format(new Date(ref.join_date), "PPP")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">KYC Status</span>
                <Badge variant={ref.kyc_status === "Approved" ? "default" : "outline"}>
                  {ref.kyc_status}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Has Invested</span>
                {ref.has_invested ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <div className="text-center text-muted-foreground p-8 border rounded-lg">
          You have no direct referrals yet.
        </div>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Direct Referrals</CardTitle>
        <CardDescription>A list of users who signed up directly using your code.</CardDescription>
      </CardHeader>
      <CardContent>
        {isMobile ? renderMobileView() : renderDesktopView()}
      </CardContent>
    </Card>
  );
};

export default DirectReferralsList;