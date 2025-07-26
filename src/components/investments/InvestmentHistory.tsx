import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { UserInvestment } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useAuth } from "../auth/AuthProvider";

const fetchUserInvestments = async (userId: string): Promise<UserInvestment[]> => {
  const { data, error } = await supabase
    .from('user_investments')
    .select(`
      id,
      investment_amount,
      start_date,
      maturity_date,
      status,
      investment_plans ( name )
    `)
    .eq('user_id', userId)
    .order('start_date', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

const InvestmentHistory = () => {
  const { user } = useAuth();
  const { data: investments, isLoading, isError, error } = useQuery<UserInvestment[]>({
    queryKey: ['userInvestments', user?.id],
    queryFn: () => fetchUserInvestments(user!.id),
    enabled: !!user,
  });

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>My Investment Portfolio</CardTitle>
        <CardDescription>A record of all your active and past investments.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan Name</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>Maturity Date</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : isError ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-red-500">
                  Error: {error.message}
                </TableCell>
              </TableRow>
            ) : investments && investments.length > 0 ? (
              investments.map((investment) => (
                <TableRow key={investment.id}>
                  <TableCell className="font-medium">{investment.investment_plans?.name || 'N/A'}</TableCell>
                  <TableCell>₹{investment.investment_amount.toLocaleString('en-IN')}</TableCell>
                  <TableCell>{format(new Date(investment.start_date), "PPP")}</TableCell>
                  <TableCell>{format(new Date(investment.maturity_date), "PPP")}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={investment.status === "Active" ? "default" : "secondary"}>
                      {investment.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  You have no investments yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default InvestmentHistory;