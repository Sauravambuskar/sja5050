import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { WithdrawalRequest } from "@/types/database";
import { Skeleton } from "../ui/skeleton";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { Alert, AlertDescription } from "../ui/alert";
import { Info } from "lucide-react";
import { useState } from "react";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { usePagination, DOTS } from "@/hooks/usePagination";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 5;

const withdrawalSchema = z.object({
  amount: z.coerce.number().positive({ message: "Amount must be a positive number." }),
});

const requestWithdrawal = async (amount: number) => {
  const { error } = await supabase.rpc('request_withdrawal', { request_amount: amount });
  if (error) throw new Error(error.message);
};

const fetchWalletBalance = async (): Promise<number> => {
  const { data, error } = await supabase.rpc('get_my_wallet_balance');
  if (error) {
    console.error("Error fetching wallet balance:", error);
    toast.error("Could not fetch wallet balance.");
    return 0;
  }
  return data ?? 0;
};

const fetchWithdrawalHistory = async (page: number): Promise<WithdrawalRequest[]> => {
  const { data, error } = await supabase.rpc('get_my_withdrawal_requests', {
    p_limit: PAGE_SIZE,
    p_offset: (page - 1) * PAGE_SIZE,
  });
  if (error) throw new Error(error.message);
  return data;
};

const fetchWithdrawalHistoryCount = async (): Promise<number> => {
  const { data, error } = await supabase.rpc('get_my_withdrawal_requests_count');
  if (error) throw new Error(error.message);
  return data;
};

const WithdrawalRequests = () => {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [currentPage, setCurrentPage] = useState(1);
  const form = useForm<z.infer<typeof withdrawalSchema>>({
    resolver: zodResolver(withdrawalSchema),
  });

  const { data: walletBalance, isLoading: isLoadingBalance } = useQuery<number>({
    queryKey: ['walletBalance'],
    queryFn: fetchWalletBalance,
  });

  const { data: history, isLoading } = useQuery<WithdrawalRequest[]>({
    queryKey: ['withdrawalHistory', currentPage],
    queryFn: () => fetchWithdrawalHistory(currentPage),
    placeholderData: keepPreviousData,
  });

  const { data: totalRequests } = useQuery<number>({
    queryKey: ['withdrawalHistoryCount'],
    queryFn: fetchWithdrawalHistoryCount,
  });

  const paginationRange = usePagination({
    currentPage,
    totalCount: totalRequests || 0,
    pageSize: PAGE_SIZE,
  });
  const pageCount = totalRequests ? Math.ceil(totalRequests / PAGE_SIZE) : 0;

  const mutation = useMutation({
    mutationFn: requestWithdrawal,
    onSuccess: () => {
      toast.success("Withdrawal request submitted successfully!");
      queryClient.invalidateQueries({ queryKey: ['withdrawalHistory'] });
      queryClient.invalidateQueries({ queryKey: ['withdrawalHistoryCount'] });
      queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
      form.reset({ amount: 0 });
    },
    onError: (error) => {
      toast.error(`Request failed: ${error.message}`);
    },
  });

  const onSubmit = (values: z.infer<typeof withdrawalSchema>) => {
    mutation.mutate(values.amount);
  };

  const renderPagination = () => (
    pageCount > 1 && (
      <Pagination className="mt-6">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); if (currentPage > 1) setCurrentPage(p => p - 1); }} className={cn(currentPage === 1 && "pointer-events-none opacity-50")} />
          </PaginationItem>
          {paginationRange?.map((pageNumber, index) => {
            if (pageNumber === DOTS) {
              return <PaginationItem key={`dots-${index}`}><PaginationEllipsis /></PaginationItem>;
            }
            return (
              <PaginationItem key={pageNumber}>
                <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(pageNumber as number); }} isActive={currentPage === pageNumber}>
                  {pageNumber}
                </PaginationLink>
              </PaginationItem>
            );
          })}
          <PaginationItem>
            <PaginationNext href="#" onClick={(e) => { e.preventDefault(); if (currentPage < pageCount) setCurrentPage(p => p + 1); }} className={cn(currentPage === pageCount && "pointer-events-none opacity-50")} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
  );

  const renderDesktopHistory = () => (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Details</TableHead>
            <TableHead className="text-right">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && !history ? (
            [...Array(3)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-5 w-20" /><Skeleton className="h-4 w-24 mt-1" /></TableCell>
                <TableCell className="text-right"><Skeleton className="h-5 w-16 ml-auto" /></TableCell>
              </TableRow>
            ))
          ) : history && history.length > 0 ? (
            history.map((req) => (
              <TableRow key={req.request_id}>
                <TableCell>
                  <div className="font-medium">₹{req.amount.toLocaleString('en-IN')}</div>
                  <div className="text-sm text-muted-foreground">{format(new Date(req.requested_at), "PPP")}</div>
                  {req.status === 'Rejected' && req.admin_notes && (
                    <div className="text-xs text-destructive mt-1">Note: {req.admin_notes}</div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant={
                      req.status === "Completed" || req.status === "Approved"
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
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={3} className="h-24 text-center">No withdrawal requests yet.</TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {renderPagination()}
    </>
  );

  const renderMobileHistory = () => (
    <div className="space-y-4">
      {isLoading && !history ? (
        [...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-start justify-between">
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-16" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-5 w-full" />
            </CardContent>
          </Card>
        ))
      ) : history && history.length > 0 ? (
        history.map((req) => (
          <Card key={req.request_id}>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <CardTitle className="text-xl">₹{req.amount.toLocaleString('en-IN')}</CardTitle>
                <Badge
                  variant={
                    req.status === "Completed" || req.status === "Approved"
                      ? "success"
                      : req.status === "Pending"
                      ? "outline"
                      : "destructive"
                  }
                >
                  {req.status}
                </Badge>
              </div>
              <CardDescription>{format(new Date(req.requested_at), "PPP")}</CardDescription>
            </CardHeader>
            {req.status === 'Rejected' && req.admin_notes && (
              <CardContent className="pb-4">
                <Alert variant="destructive" className="p-3">
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Note: {req.admin_notes}
                  </AlertDescription>
                </Alert>
              </CardContent>
            )}
          </Card>
        ))
      ) : (
        <div className="text-center text-muted-foreground p-8 border rounded-lg">
          No withdrawal requests yet.
        </div>
      )}
      {renderPagination()}
    </div>
  );

  return (
    <div className="grid gap-6 pt-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Request a Withdrawal</CardTitle>
          <CardDescription>Enter the amount you wish to withdraw from your wallet.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Available Balance</span>
                  {isLoadingBalance ? (
                    <Skeleton className="h-6 w-24" />
                  ) : (
                    <span className="text-xl font-bold">
                      ₹{walletBalance?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0.00'}
                    </span>
                  )}
                </div>
              </div>
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (₹)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type="number" placeholder="e.g., 5000" {...field} className="pr-16" />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-7"
                          onClick={() => form.setValue('amount', walletBalance ?? 0)}
                          disabled={isLoadingBalance || !walletBalance}
                        >
                          Max
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? "Submitting..." : "Submit Request"}
              </Button>
            </CardContent>
          </form>
        </Form>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal History</CardTitle>
          <CardDescription>Your recent withdrawal requests.</CardDescription>
        </CardHeader>
        <CardContent>
          {isMobile ? renderMobileHistory() : renderDesktopHistory()}
        </CardContent>
      </Card>
    </div>
  );
};

export default WithdrawalRequests;