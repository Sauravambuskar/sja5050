import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Download, Loader2, FileSpreadsheet } from "lucide-react";
import { cn, exportToCsv, exportToPdf } from "@/lib/utils";
import { format, startOfMonth } from "date-fns";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth/AuthProvider";
import { useIsMobile } from "@/hooks/use-mobile";
import { useNavigate } from "react-router-dom";

type LedgerItem = {
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
  const [month, setMonth] = useState<Date | undefined>(new Date());
  const [reportData, setReportData] = useState<LedgerItem[]>([]);

  const mutation = useMutation({
    mutationFn: fetchLedgerData,
    onSuccess: (data) => {
      setReportData(data);
      if (data.length === 0) {
        toast.info("No active investments found for the selected month.");
      } else {
        toast.success(`Ledger generated with ${data.length} records.`);
      }
    },
    onError: (error) => {
      toast.error(`Failed to generate ledger: ${error.message}`);
    },
  });

  const handleGenerateReport = () => {
    if (!month) {
      toast.error("Please select a month.");
      return;
    }
    mutation.mutate(month);
  };

  const handleExport = (formatType: 'csv' | 'pdf') => {
    if (reportData.length === 0) {
      toast.warning("No data to export. Please generate a report first.");
      return;
    }
    const filename = `ledger_report_${format(month!, 'yyyy-MM')}`;
    const title = `SJA Foundation Ledger - ${format(month!, 'MMMM yyyy')}`;

    if (formatType === 'csv') {
      exportToCsv(`${filename}.csv`, reportData);
    } else {
      const headers = ["Client", "Investment", "Monthly Payout", "Accrued", "Bank Details"];
      const body = reportData.map(item => [
        item.user_name,
        `₹${item.investment_amount.toLocaleString('en-IN')}`,
        `₹${item.monthly_payout.toLocaleString('en-IN')}`,
        `₹${item.accrued_in_period.toLocaleString('en-IN')}`,
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
    return acc;
  }, { investment_amount: 0, monthly_payout: 0, accrued_in_period: 0 });

  const renderDesktopView = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Client</TableHead>
          <TableHead>Investment Amount</TableHead>
          <TableHead>Monthly Payout</TableHead>
          <TableHead>Daily Payout</TableHead>
          <TableHead>Days</TableHead>
          <TableHead>Accrued This Period</TableHead>
          <TableHead>Bank Details</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {mutation.isPending ? (
          [...Array(5)].map((_, i) => (
            <TableRow key={i}>
              <TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell>
            </TableRow>
          ))
        ) : reportData.length > 0 ? (
          reportData.map((item) => (
            <TableRow key={item.investment_id} onClick={() => navigate(`/admin/user-management?user=${item.user_id}`)} className="cursor-pointer">
              <TableCell>
                <div className="font-medium">{item.user_name}</div>
                <div className="text-sm text-muted-foreground">{item.plan_name}</div>
              </TableCell>
              <TableCell>₹{item.investment_amount.toLocaleString('en-IN')}</TableCell>
              <TableCell>₹{item.monthly_payout.toLocaleString('en-IN')}</TableCell>
              <TableCell>₹{item.daily_payout.toLocaleString('en-IN')}</TableCell>
              <TableCell>{item.days_in_period}</TableCell>
              <TableCell className="font-semibold">₹{item.accrued_in_period.toLocaleString('en-IN')}</TableCell>
              <TableCell className="text-xs">
                <div>{item.bank_account_holder_name}</div>
                <div className="font-mono">{item.bank_account_number}</div>
                <div className="font-mono">{item.bank_ifsc_code}</div>
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={7} className="h-24 text-center">
              No report generated. Please select a month and click "Generate Report".
            </TableCell>
          </TableRow>
        )}
      </TableBody>
      <TableFooter>
        <TableRow className="font-bold bg-muted/50">
            <TableCell>Total</TableCell>
            <TableCell>₹{totals.investment_amount.toLocaleString('en-IN')}</TableCell>
            <TableCell>₹{totals.monthly_payout.toLocaleString('en-IN')}</TableCell>
            <TableCell colSpan={2}></TableCell>
            <TableCell>₹{totals.accrued_in_period.toLocaleString('en-IN')}</TableCell>
            <TableCell></TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );

  const renderMobileView = () => (
    <div className="space-y-4">
      {mutation.isPending ? (
        [...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)
      ) : reportData.length > 0 ? (
        reportData.map((item) => (
          <Card key={item.investment_id} onClick={() => navigate(`/admin/user-management?user=${item.user_id}`)}>
            <CardHeader>
                <CardTitle>{item.user_name}</CardTitle>
                <CardDescription>{item.plan_name}</CardDescription>
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
          </Card>
        ))
      ) : (
        <div className="text-center text-muted-foreground p-8 border rounded-lg">
          No report generated.
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
                <Calendar mode="single" selected={month} onSelect={setMonth} initialFocus captionLayout="dropdown-buttons" fromYear={new Date().getFullYear() - 5} toYear={new Date().getFullYear()} />
              </PopoverContent>
            </Popover>
            <Button onClick={handleGenerateReport} disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
              Generate Ledger
            </Button>
          </div>

          <div className="mt-6 rounded-md border">
            {isMobile ? renderMobileView() : renderDesktopView()}
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default AdminLedger;