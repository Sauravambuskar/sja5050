import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Download, Loader2, FileSpreadsheet, MoreHorizontal } from "lucide-react";
import { cn, exportToCsv, exportToPdf } from "@/lib/utils";
import { format, startOfMonth } from "date-fns";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth/AuthProvider";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";
import { ManagePayoutDialog } from "@/components/admin/ManagePayoutDialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import useLedgerSync from "@/hooks/useLedgerSync";

export type LedgerItem = {
  user_id: string;
  user_name: string;
  investment_id: string;
  plan_name: string;
  investment_amount: number;
  monthly_payout: number;
  daily_payout: number;
  days_in_period: number;
  accrued_in_period: number;
  bank_account_holder_name: string;
  bank_account_number: string;
  bank_ifsc_code: string;
  payout_status: string;
  payout_remarks: string | null;
  paid_amount: number | null;
  payment_date: string | null;
};

const fetchLedgerData = async (month: Date): Promise<LedgerItem[]> => {
  const startDate = startOfMonth(month);
  const { data, error } = await supabase.rpc('get_admin_ledger', {
    p_month_start: format(startDate, 'yyyy-MM-dd'),
  });

  if (error) throw new Error(error.message);
  return data || [];
};

const AdminLedger = () => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [month, setMonth] = useState<Date>(new Date());
  const [selectedPayout, setSelectedPayout] = useState<LedgerItem | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: reportData = [], isLoading, isFetching } = useQuery<LedgerItem[]>({
    queryKey: ['adminLedger', month],
    queryFn: () => fetchLedgerData(month),
    enabled: !!month,
  });

  useLedgerSync();

  const handleManagePayout = (item: LedgerItem) => {
    setSelectedPayout(item);
    setIsDialogOpen(true);
  };

  const handleExport = (formatType: 'csv' | 'pdf') => {
    if (reportData.length === 0) {
      toast.warning("No data to export. Please generate a report first.");
      return;
    }
    const filename = `ledger_report_${format(month!, 'yyyy-MM')}`;
    const title = `SJA Foundation Ledger - ${format(month!, 'MMMM yyyy')}`;

    const exportableData = reportData.map(item => ({
      ...item,
      paid_amount: item.paid_amount ?? 0,
      payment_date: item.payment_date ? format(new Date(item.payment_date), 'PPpp') : 'N/A'
    }));

    if (formatType === 'csv') {
      exportToCsv(`${filename}.csv`, exportableData);
    } else {
      const headers = ["Client", "Investment", "Accrued", "Status", "Paid Amount", "Bank Details"];
      const body = exportableData.map(item => [
        item.user_name,
        `₹${item.investment_amount.toLocaleString('en-IN')}`,
        `₹${item.accrued_in_period.toLocaleString('en-IN')}`,
        item.payout_status,
        `₹${item.paid_amount.toLocaleString('en-IN')}`,
        `${item.bank_account_holder_name}\n${item.bank_account_number}\n${item.bank_ifsc_code}`,
      ]);
      exportToPdf(`${filename}.pdf`, title, headers, body, user?.user_metadata?.full_name || "Admin");
    }
    toast.success(`Report exported as ${formatType.toUpperCase()} successfully.`);
  };
  
  const totals = reportData.reduce((acc, item) => {
    acc.investment_amount += item.investment_amount;
    acc.monthly_payout += item.monthly_payout;
    acc.accrued_in_period += item.accrued_in_period;
    acc.paid_amount += item.paid_amount ?? 0;
    return acc;
  }, { investment_amount: 0, monthly_payout: 0, accrued_in_period: 0, paid_amount: 0 });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Paid': return <Badge variant="success">Paid</Badge>;
      case 'Rejected': return <Badge variant="destructive">Rejected</Badge>;
      default: return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const renderDesktopView = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Client</TableHead>
          <TableHead>Investment</TableHead>
          <TableHead>Accrued</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Bank Details</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <TableRow key={i}>
              <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
            </TableRow>
          ))
        ) : reportData.length > 0 ? (
          reportData.map((item) => (
            <TableRow key={item.investment_id}>
              <TableCell>
                <div className="font-medium hover:underline cursor-pointer" onClick={() => navigate(`/admin/user-management?user=${item.user_id}`)}>{item.user_name}</div>
                <div className="text-sm text-muted-foreground">{item.plan_name}</div>
              </TableCell>
              <TableCell>
                <div>₹{item.investment_amount.toLocaleString('en-IN')}</div>
                <div className="text-xs text-muted-foreground">Monthly: ₹{item.monthly_payout.toLocaleString('en-IN')}</div>
              </TableCell>
              <TableCell className="font-semibold">
                <div>₹{item.accrued_in_period.toLocaleString('en-IN')}</div>
                <div className="text-xs font-normal text-muted-foreground">for {item.days_in_period} days</div>
              </TableCell>
              <TableCell>{getStatusBadge(item.payout_status)}</TableCell>
              <TableCell className="text-xs">
                <div>{item.bank_account_holder_name}</div>
                <div className="font-mono">{item.bank_account_number}</div>
                <div className="font-mono">{item.bank_ifsc_code}</div>
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" onClick={() => handleManagePayout(item)}>Manage</Button>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={6} className="h-24 text-center">
              No report data. Please select a month and generate the report.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
      <TableFooter>
        <TableRow className="font-bold bg-muted/50">
            <TableCell>Total</TableCell>
            <TableCell>₹{totals.investment_amount.toLocaleString('en-IN')}</TableCell>
            <TableCell>₹{totals.accrued_in_period.toLocaleString('en-IN')}</TableCell>
            <TableCell>Paid: ₹{totals.paid_amount.toLocaleString('en-IN')}</TableCell>
            <TableCell colSpan={2}></TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );

  const renderMobileView = () => (
    <div className="space-y-4">
      {isLoading ? (
        [...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)
      ) : reportData.length > 0 ? (
        reportData.map((item) => (
          <Card key={item.investment_id}>
            <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="cursor-pointer hover:underline" onClick={() => navigate(`/admin/user-management?user=${item.user_id}`)}>{item.user_name}</CardTitle>
                    <CardDescription>{item.plan_name}</CardDescription>
                  </div>
                  {getStatusBadge(item.payout_status)}
                </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Investment</span><span className="font-semibold">₹{item.investment_amount.toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Accrued ({item.days_in_period} days)</span><span className="font-semibold">₹{item.accrued_in_period.toLocaleString('en-IN')}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Monthly Payout</span><span>₹{item.monthly_payout.toLocaleString('en-IN')}</span></div>
              <div className="pt-2 border-t">
                <p className="font-medium">{item.bank_account_holder_name}</p>
                <p className="font-mono text-muted-foreground">{item.bank_account_number}</p>
                <p className="font-mono text-muted-foreground">{item.bank_ifsc_code}</p>
              </div>
            </CardContent>
            <CardContent>
              <Button className="w-full" onClick={() => handleManagePayout(item)}>Manage Payout</Button>
            </CardContent>
          </Card>
        ))
      ) : (
        <div className="text-center text-muted-foreground p-8 border rounded-lg">
          No report data.
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Ledger</h1>
          <p className="text-muted-foreground">View and export monthly payout calculations for all clients.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-1" onClick={() => handleExport('csv')} disabled={reportData.length === 0}>
            <Download className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Export CSV</span>
          </Button>
          <Button variant="outline" className="gap-1" onClick={() => handleExport('pdf')} disabled={reportData.length === 0}>
            <Download className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Export PDF</span>
          </Button>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Generate Ledger</CardTitle>
          <CardDescription>Select a month to see all active investments and their calculated profit accrued for that period.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant={"outline"} className={cn("w-[280px] justify-start text-left font-normal", !month && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {month ? format(month, "MMMM yyyy") : <span>Pick a month</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar mode="single" selected={month} onSelect={(day) => day && setMonth(day)} initialFocus captionLayout="dropdown-buttons" fromYear={new Date().getFullYear() - 5} toYear={new Date().getFullYear()} />
              </PopoverContent>
            </Popover>
            <Button onClick={() => {}} disabled={true} className="opacity-0 pointer-events-none">
              Generate Ledger
            </Button>
          </div>

          <div className="mt-6 rounded-md border">
            {isMobile ? renderMobileView() : renderDesktopView()}
          </div>
        </CardContent>
      </Card>
      <ManagePayoutDialog isOpen={isDialogOpen} onOpenChange={setIsDialogOpen} payout={selectedPayout} month={month} />
    </>
  );
};

export default AdminLedger;