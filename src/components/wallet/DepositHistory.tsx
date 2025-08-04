import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DepositRequest } from "@/types/database";
import { Skeleton } from "../ui/skeleton";
import { format } from "date-fns";

const fetchDepositHistory = async (): Promise<DepositRequest[]> => {
  const { data, error } = await supabase.rpc('get_my_deposit_requests');
  if (error) throw new Error(error.message);
  return data;
};

const DepositHistory = () => {
  const { data: history, isLoading } = useQuery<DepositRequest[]>({
    queryKey: ['depositHistory'],
    queryFn: fetchDepositHistory,
  });

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Deposit History</CardTitle>
        <CardDescription>Your recent deposit requests and their status.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Amount</TableHead>
              <TableHead>Reference ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-6 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : history && history.length > 0 ? (
              history.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">₹{req.amount.toLocaleString('en-IN')}</TableCell>
                  <TableCell className="font-mono">{req.reference_id}</TableCell>
                  <TableCell>{format(new Date(req.requested_at), "PPP")}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={req.status === "Approved" ? "default" : req.status === "Pending" ? "outline" : "destructive"}>
                      {req.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">No deposit requests yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default DepositHistory;