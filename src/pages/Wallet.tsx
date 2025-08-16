import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowDown, ArrowUp, ArrowRightLeft, Download, Loader2 } from "lucide-react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Transaction } from "@/types/database";
import { format } from "date-fns";
import { cn, exportToCsv, exportToPdf } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WithdrawalRequests from "@/components/wallet/WithdrawalRequests";
import ManualDeposit from "@/components/wallet/ManualDeposit";
import DepositHistory from "@/components/wallet/DepositHistory";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { useState, useEffect } from "react";
import { usePagination, DOTS } from "@/hooks/usePagination";
import { useSearchParams } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/auth/AuthProvider";
import StripeDeposit from "@/components/wallet/StripeDeposit";

const PAGE_SIZE = 10;

const fetchWalletBalance = async (): Promise<number> => {
  const { data, error } = await supabase.rpc('get_my_wallet_balance');
  if (error) throw new Error(error.message);
  return data;
};

const fetchTransactions = async (page: number, filter: string): Promise<Transaction[]> => {
  const { data, error } = await supabase.rpc('get_my_transactions', {
    page_limit: PAGE_SIZE,
    page_offset: (page - 1) * PAGE_SIZE,
    p_type_filter: filter === 'all' ? null : filter,
  });
  if (error) throw new Error(error.message);
  return data;
};

const fetchTransactionsCount = async (filter: string): Promise<number> => {
  const { data, error } = await supabase.rpc('get_my_transactions_count', {
    p_type_filter: filter === 'all' ? null : filter,
  });
  if (error) throw new Error(error.message);
  return data;
};

const Wallet = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const defaultTab = searchParams.get("tab") || "history";
  const isMobile = useIsMobile();

  useEffect(() => {
    const paymentStatus = searchParams.get('payment');
    if (paymentStatus === 'success') {
      toast.success("Payment successful!", { description: "Your wallet balance will be updated shortly." });
      searchParams.delete('payment');
      setSearchParams(searchParams);
    } else if (paymentStatus === 'cancelled') {
      toast.warning("Payment cancelled.", { description: "Your deposit was not processed." });
      searchParams.delete('payment');
      setSearchParams(searchParams);
    }
  }, [searchParams, setSearchParams]);

  const { data: balance, isLoading: isBalanceLoading } = useQuery<number>({
    queryKey: ['walletBalance'],
    queryFn: fetchWalletBalance,
  });

  const { data: transactions, isLoading: areTransactionsLoading } = useQuery({
    queryKey: ['transactions', currentPage, typeFilter],
    queryFn: () => fetchTransactions(currentPage, typeFilter),
    placeholderData: keepPreviousData,
  });

  const { data: totalTransactions } = useQuery<number>({
    queryKey: ['transactionsCount', typeFilter],
    queryFn: () => fetchTransactionsCount(typeFilter),
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [typeFilter]);

  const paginationRange = usePagination({
    currentPage,
    totalCount: totalTransactions || 0,
    pageSize: PAGE_SIZE,
  });

  const pageCount = totalTransactions ? Math.ceil(totalTransactions / PAGE_SIZE) : 0;

  const handleExport = async (formatType: 'csv' | 'pdf') => {
    setIsExporting(true);
    toast.info(`Preparing your transaction history as a ${formatType.toUpperCase()} file...`);

    try {
      const { data, error } = await supabase.rpc('get_my_full_transaction_history');
      if (error) throw error;

      if (!data || data.length === 0) {
        toast.warning("No transactions to export.");
        return;
      }

      const filename = `SJA_Statement_${format(new Date(), 'yyyy-MM-dd')}`;

      if (formatType === 'csv') {
        const formattedData = data.map((txn: Transaction) => ({
          Date: format(new Date(txn.created_at), 'yyyy-MM-dd HH:mm:ss'),
          Type: txn.type,
          Description: txn.description || '',
          Amount: txn.amount,
          Status: txn.status,
        }));
        exportToCsv(`${filename}.csv`, formattedData);
      } else {
        const headers = ["Date", "Type", "Description", "Amount (INR)", "Status"];
        const body = data.map((txn: Transaction) => [
          format(new Date(txn.created_at), 'PPp'),
          txn.type,
          txn.description || '-',
          txn.amount.toLocaleString('en-IN'),
          txn.status,
        ]);
        exportToPdf(`${filename}.pdf`, "Account Statement", headers, body, user?.user_metadata?.full_name || "User");
      }

      toast.success(`Statement exported successfully as ${formatType.toUpperCase()}!`);

    } catch (error: any) {
      toast.error(`Export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'Deposit': case 'Commission': return <ArrowDown className="h-5 w-5 text-green-500" />;
      case 'Withdrawal': case 'Investment': return <ArrowUp className="h-5 w-5 text-red-500" />;
      default: return <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getTransactionAmountClass = (type: string) => {
    switch (type) {
      case 'Deposit': case 'Commission': return 'text-green-600';
      case 'Withdrawal': case 'Investment': return 'text-destructive';
      default: return '';
    }
  };

  const getTransactionAmountPrefix = (type: string) => {
    switch (type) {
      case 'Deposit': case 'Commission': return '+';
      case 'Withdrawal': case 'Investment': return '-';
      default: return '';
    }
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

  const renderDesktopView = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[50px] text-center">Type</TableHead>
          <TableHead>Details</TableHead>
          <TableHead className="text-right">Amount</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {areTransactionsLoading && !transactions ? (
          [...Array(PAGE_SIZE)].map((_, i) => (
            <TableRow key={i}>
              <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
              <TableCell><Skeleton className="h-5 w-3/4" /><Skeleton className="h-4 w-1/2 mt-1" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-5 w-20 ml-auto" /></TableCell>
            </TableRow>
          ))
        ) : transactions && transactions.length > 0 ? (
          transactions.map((txn) => (
            <TableRow key={txn.id}>
              <TableCell>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                  {getTransactionIcon(txn.type)}
                </div>
              </TableCell>
              <TableCell>
                <div className="font-medium">{txn.description || txn.type}</div>
                <div className="text-sm text-muted-foreground">{format(new Date(txn.created_at), "PPP p")}</div>
              </TableCell>
              <TableCell className={cn("text-right font-semibold", getTransactionAmountClass(txn.type))}>
                {getTransactionAmountPrefix(txn.type)} ₹{txn.amount.toLocaleString('en-IN')}
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={3} className="text-center h-24">No transactions found for this filter.</TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  const renderMobileView = () => (
    <div className="space-y-0">
      {areTransactionsLoading && !transactions ? (
        [...Array(PAGE_SIZE)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
      ) : transactions && transactions.length > 0 ? (
        transactions.map((txn) => (
          <div key={txn.id} className="flex items-center gap-4 border-b p-4 last:border-b-0">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-muted">
              {getTransactionIcon(txn.type)}
            </div>
            <div className="flex-grow space-y-0.5">
              <div className="font-medium">{txn.description || txn.type}</div>
              <div className="text-xs text-muted-foreground">{format(new Date(txn.created_at), "PPP p")}</div>
            </div>
            <div className={cn("text-right font-semibold", getTransactionAmountClass(txn.type))}>
              {getTransactionAmountPrefix(txn.type)} ₹{txn.amount.toLocaleString('en-IN')}
            </div>
          </div>
        ))
      ) : (
        <div className="flex h-24 items-center justify-center text-center text-muted-foreground">No transactions found for this filter.</div>
      )}
    </div>
  );

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">My Wallet</h1>
      </div>
      <p className="text-muted-foreground">
        Manage your balance, view transactions, and make withdrawals.
      </p>

      <Card className="mt-6">
        <CardHeader>
            <CardTitle>Available Balance</CardTitle>
            <CardDescription>This is the amount you can withdraw or invest.</CardDescription>
        </CardHeader>
        <CardContent>
            {isBalanceLoading ? (
              <Skeleton className="h-10 w-3/4" />
            ) : (
              <div className="text-4xl font-bold">
                ₹{balance?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            )}
        </CardContent>
      </Card>

      <Tabs defaultValue={defaultTab} className="mt-6">
        <TabsList className="grid w-full grid-cols-4 md:w-[500px]">
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="deposit">Automated Deposit</TabsTrigger>
          <TabsTrigger value="manual-deposit">Manual Deposit</TabsTrigger>
          <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
        </TabsList>
        <TabsContent value="history">
          <Card className="mt-4">
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Transaction History</CardTitle>
                  <CardDescription>A record of all your wallet activities.</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Transactions</SelectItem>
                      <SelectItem value="Deposit">Deposits</SelectItem>
                      <SelectItem value="Withdrawal">Withdrawals</SelectItem>
                      <SelectItem value="Investment">Investments</SelectItem>
                      <SelectItem value="Commission">Commissions</SelectItem>
                      <SelectItem value="Investment Payout">Payouts</SelectItem>
                    </SelectContent>
                  </Select>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" disabled={isExporting}>
                        {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleExport('csv')}>Export as CSV</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport('pdf')}>Export as PDF</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0 sm:p-6">
              {isMobile ? renderMobileView() : renderDesktopView()}
              {renderPagination()}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="deposit">
          <StripeDeposit />
        </TabsContent>
        <TabsContent value="manual-deposit">
          <ManualDeposit />
          <DepositHistory />
        </TabsContent>
        <TabsContent value="withdraw">
          <WithdrawalRequests />
        </TabsContent>
      </Tabs>
    </>
  );
};

export default Wallet;