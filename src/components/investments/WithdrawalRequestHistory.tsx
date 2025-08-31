import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { UserInvestmentWithdrawalRequest } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

const fetchMyWithdrawalRequests = async (): Promise<UserInvestmentWithdrawalRequest[]> => {
  const { data, error } = await supabase.rpc('get_my_investment_withdrawal_requests');
  if (error) throw new Error(error.message);
  return data;
};

export const WithdrawalRequestHistory = () => {
  const { data: requests, isLoading } = useQuery<UserInvestmentWithdrawalRequest[]>({
    queryKey: ['myInvestmentWithdrawalRequests'],
    queryFn: fetchMyWithdrawalRequests,
  });

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  if (!requests || requests.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-4">
        You have not made any withdrawal requests.
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Plan</TableHead>
            <TableHead>Requested Amount</TableHead>
            <TableHead>Requested At</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.request_id}>
              <TableCell>{request.plan_name}</TableCell>
              <TableCell>₹{request.requested_amount.toLocaleString('en-IN')}</TableCell>
              <TableCell>{format(new Date(request.requested_at), 'PPP p')}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Badge variant={request.status === "Approved" ? "success" : request.status === "Pending" ? "outline" : "destructive"}>
                    {request.status}
                  </Badge>
                  {(request.admin_notes || request.reason) && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-muted-foreground cursor-pointer" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        {request.reason && <p><strong>Your Reason:</strong> {request.reason}</p>}
                        {request.admin_notes && <p className="mt-2"><strong>Admin Notes:</strong> {request.admin_notes}</p>}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TooltipProvider>
  );
};