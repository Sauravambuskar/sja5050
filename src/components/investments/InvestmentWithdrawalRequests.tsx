"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { UserInvestmentWithdrawalRequest } from "@/types/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { History, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useIsMobile } from "@/hooks/use-mobile";

const fetchInvestmentWithdrawalRequests = async (): Promise<UserInvestmentWithdrawalRequest[]> => {
  const { data, error } = await supabase.rpc('get_my_investment_withdrawal_requests');
  if (error) throw new Error(error.message);
  return data;
};

export const InvestmentWithdrawalRequests = () => {
  const { data: withdrawalRequests, isLoading: isLoadingWithdrawalRequests } = useQuery<UserInvestmentWithdrawalRequest[]>({
    queryKey: ['myInvestmentWithdrawalRequests'],
    queryFn: fetchInvestmentWithdrawalRequests,
  });
  const isMobile = useIsMobile();

  const renderDesktopView = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Plan</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Requested At</TableHead>
          <TableHead className="text-right">Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoadingWithdrawalRequests ? (
          [...Array(3)].map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-5 w-20" /></TableCell>
              <TableCell><Skeleton className="h-5 w-16" /></TableCell>
              <TableCell><Skeleton className="h-5 w-24" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-6 w-16 ml-auto" /></TableCell>
            </TableRow>
          ))
        ) : withdrawalRequests && withdrawalRequests.length > 0 ? (
          withdrawalRequests.map((req) => (
            <React.Fragment key={req.request_id}>
              <TableRow>
                <TableCell className="font-medium">{req.plan_name}</TableCell>
                <TableCell>₹{req.investment_amount.toLocaleString('en-IN')}</TableCell>
                <TableCell>{format(new Date(req.requested_at), "PPP")}</TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={
                      req.status === "Approved" || req.status === "Completed"
                        ? "success"
                        : req.status === "Pending"
                        ? "outline"
                        : "destructive"
                    }
                  >
                    {req.status}
                  </Badge>
                </TableCell>
              </TableRow>
              {req.admin_notes && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Alert variant="destructive" className="p-3">
                      <Info className="h-4 w-4" />
                      <AlertDescription className="text-xs">
                        Admin Note: {req.admin_notes}
                      </AlertDescription>
                    </Alert>
                  </TableCell>
                </TableRow>
              )}
            </React.Fragment>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={4} className="h-24 text-center">No investment withdrawal requests yet.</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  const renderMobileView = () => (
    <div className="space-y-4">
      {isLoadingWithdrawalRequests ? (
        [...Array(2)].map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)
      ) : withdrawalRequests && withdrawalRequests.length > 0 ? (
        withdrawalRequests.map((req) => (
          <Card key={req.request_id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base">{req.plan_name}</CardTitle>
                  <p className="text-lg font-bold text-primary">₹{req.investment_amount.toLocaleString('en-IN')}</p>
                </div>
                <Badge
                  variant={
                    req.status === "Approved" || req.status === "Completed"
                      ? "success"
                      : req.status === "Pending"
                      ? "outline"
                      : "destructive"
                  }
                >
                  {req.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex items-center">
                <span className="text-muted-foreground w-24">Requested:</span>
                <span>{format(new Date(req.requested_at), "PP")}</span>
              </div>
              {req.admin_notes && (
                <Alert variant="destructive" className="p-3 mt-2">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Admin Note: {req.admin_notes}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        ))
      ) : (
        <p className="text-center text-muted-foreground py-8">No investment withdrawal requests yet.</p>
      )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <History />
          <CardTitle>Investment Withdrawal History</CardTitle>
        </div>
        <CardDescription>Your past requests to withdraw investments.</CardDescription>
      </CardHeader>
      <CardContent>
        {isMobile ? renderMobileView() : renderDesktopView()}
      </CardContent>
    </Card>
  );
};