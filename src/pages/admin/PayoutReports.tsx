import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Download, Loader2 } from "lucide-react";
import { cn, exportToCsv, exportToPdf } from "@/lib/utils";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/auth/AuthProvider";

type PayoutReportItem = {
  user_id: string;
  user_name: string;
  investment_id: string;
  plan_name: string;
  investment_amount: number;
  start_date: string;
  maturity_date: string;
  monthly_profit: number;
  status: string;
  bank_account_holder_name: string;
  bank_account_number: string;
  bank_ifsc_code: string;
};

const fetchPayoutReport = async (month: Date): Promise<PayoutReportItem[]> => {
  const startDate = startOfMonth(month);
  const endDate = endOfMonth(month);

  const { data, error } = await supabase.rpc('get_payout_report', {
    start_date_filter: format(startDate, 'yyyy-MM-dd'),
    end_date_filter: format(endDate, 'yyyy-MM-dd'),
  });

  if (error) throw new Error(error.message);
  return data;
};

const PayoutReports = () => {
  const { user } = useAuth();
  const [month, setMonth] = useState<Date | undefined>(new Date());
  const [reportData, setReportData] = useState<PayoutReportItem[]>([]);

  const mutation = useMutation({
    mutationFn: fetchPayoutReport,
    onSuccess: (data) => {
      setReportData(data);
      if (data.length === 0) {
        toast.info("No active investments found for the selected month.");
      }
    },
    onError: (error) => {
      toast.error(`Failed to generate report: ${error.message}`);
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
    const filename = `payout_report_${format(month!, 'yyyy-MM')}`;
    const title = `Monthly Payout Report for ${format(month!, 'MMMM yyyy')}`;

    if (formatType === 'csv') {
      exportToCsv(`${filename}.csv`, reportData);
    } else {
      const headers = ["Client", "Plan", "Maturity", "Payout (INR)", "Bank Holder", "Bank Account", "IFSC"];
      const body = reportData.map(item => [
        item.user_name,
        item.plan_name,
        format(new Date(item.maturity_date), 'PPP'),
        item.monthly_profit.toLocaleString('en-IN'),
        item.bank_account_holder_name,
        item.bank_account_number,
        item.bank_ifsc_code,
      ]);
      exportToPdf(`${filename}.pdf`, title, headers, body, user?.user_metadata?.full_name || "Admin");
    }
    toast.success(`Report exported as ${formatType.toUpperCase()} successfully.`);
  };

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Monthly Payout Reports</h1>
          <p className="text-muted-foreground">Generate and export reports for monthly profit payouts.</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-1" disabled={reportData.length === 0}>
              <Download className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Export
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleExport('csv')}>Export as CSV</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport('pdf')}>Export as PDF</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Generate Monthly Payout Report</CardTitle>
          <CardDescription>Select a month to see all active investments and their calculated monthly profit payout.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn("w-[280px] justify-start text-left font-normal", !month && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {month ? format(month, "MMMM yyyy") : <span>Pick a month</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={month}
                  onSelect={setMonth}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Button onClick={handleGenerateReport} disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Report
            </Button>
          </div>

          <div className="mt-6 rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client & Plan</TableHead>
                  <TableHead>Maturity Date</TableHead>
                  <TableHead>Monthly Payout</TableHead>
                  <TableHead>Bank Details</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mutation.isPending ? (
                  [...Array(3)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : reportData.length > 0 ? (
                  reportData.map((item) => (
                    <TableRow key={item.investment_id}>
                      <TableCell>
                        <div className="font-medium">{item.user_name}</div>
                        <div className="text-sm text-muted-foreground">{item.plan_name}</div>
                      </TableCell>
                      <TableCell>{format(new Date(item.maturity_date), "PPP")}</TableCell>
                      <TableCell>
                        <div className="font-semibold">₹{item.monthly_profit.toLocaleString('en-IN')}</div>
                        <div className="text-xs text-muted-foreground">From ₹{item.investment_amount.toLocaleString('en-IN')}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <div>{item.bank_account_holder_name}</div>
                        <div className="font-mono">{item.bank_account_number}</div>
                        <div className="font-mono">{item.bank_ifsc_code}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={item.status === "Active" ? "default" : "secondary"}>{item.status}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No report generated. Please select a month and click "Generate Report".
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default PayoutReports;