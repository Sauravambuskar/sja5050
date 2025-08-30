"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { UserInvestmentWithdrawalRequest } from "@/types/database";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2, History, DollarSign } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

type UserInvestment = {
  id: string;
  plan_name: string;
  investment_amount: number;
  start_date: string;
  maturity_date: string;
  status: string;
};

const fetchActiveInvestments = async (): Promise<UserInvestment[]> => {
  const { data, error } = await supabase
    .from('user_investments')
    .select(`
      id,
      investment_amount,
      start_date,
      maturity_date,
      status,
      investment_plans (name)
    `)
    .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
    .eq('status', 'Active');

  if (error) throw new Error(error.message);

  return data.map(item => ({
    id: item.id,
    investment_amount: item.investment_amount,
    start_date: item.start_date,
    maturity_date: item.maturity_date,
    status: item.status,
    plan_name: (item.investment_plans as Array<{ name: string }>)?.[0]?.name || 'Unknown Plan',
  }));
};

const fetchInvestmentWithdrawalRequests = async (): Promise<UserInvestmentWithdrawalRequest[]> => {
  const { data, error } = await supabase.rpc('get_my_investment_withdrawal_requests');
  if (error) throw new Error(error.message);
  return data;
};

const requestInvestmentWithdrawal = async (investmentId: string) => {
  const { error } = await supabase.rpc('request_investment_withdrawal', { p_investment_id: investmentId });
  if (error) throw new Error(error.message);
};

export const InvestmentWithdrawalRequests = () => {
  const queryClient = useQueryClient();
  const [selectedInvestmentId, setSelectedInvestmentId] = useState<string | undefined>(undefined);

  const { data: activeInvestments, isLoading: isLoadingActiveInvestments } = useQuery<UserInvestment[]>({
    queryKey: ['activeInvestmentsForWithdrawal'],
    queryFn: fetchActiveInvestments,
  });

  const { data: withdrawalRequests, isLoading: isLoadingWithdrawalRequests } = useQuery<UserInvestmentWithdrawalRequest[]>({
    queryKey: ['myInvestmentWithdrawalRequests'],
    queryFn: fetchInvestmentWithdrawalRequests,
  });

  const mutation = useMutation({
    mutationFn: requestInvestmentWithdrawal,
    onSuccess: () => {
      toast.success("Investment withdrawal request submitted!", { description: "Our team will review your request shortly." });
      setSelectedInvestmentId(undefined);
      queryClient.invalidateQueries({ queryKey: ['activeInvestmentsForWithdrawal'] });
      queryClient.invalidateQueries({ queryKey: ['myInvestmentWithdrawalRequests'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] }); // To update admin view
    },
    onError: (error) => {
      toast.error(`Request failed: ${error.message}`);
    },
  });

  const handleSubmit = () => {
    if (selectedInvestmentId) {
      mutation.mutate(selectedInvestmentId);
    } else {
      toast.error("Please select an investment to withdraw.");
    }
  };

  return (
    <div className="grid gap-6 pt-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign />
            <CardTitle>Request Investment Withdrawal</CardTitle>
          </div>
          <CardDescription>Select an active investment to request a withdrawal.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingActiveInvestments ? (
            <Skeleton className="h-10 w-full" />
          ) : activeInvestments && activeInvestments.length > 0 ? (
            <Select onValueChange={setSelectedInvestmentId} value={selectedInvestmentId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select an active investment" />
              </SelectTrigger>
              <SelectContent>
                {activeInvestments.map((inv) => (
                  <SelectItem key={inv.id} value={inv.id}>
                    {inv.plan_name} - ₹{inv.investment_amount.toLocaleString('en-IN')} (Started: {format(new Date(inv.start_date), 'PPP')})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="text-muted-foreground">No active investments available for withdrawal.</p>
          )}
          <Button onClick={handleSubmit} className="w-full" disabled={!selectedInvestmentId || mutation.isPending || !activeInvestments || activeInvestments.length === 0}>
            {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {mutation.isPending ? "Submitting..." : "Submit Withdrawal Request"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History />
            <CardTitle>Investment Withdrawal History</CardTitle>
          </div>
          <CardDescription>Your past requests to withdraw investments.</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    </div>
  );
};