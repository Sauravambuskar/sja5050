import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { Download, Loader2, BarChart3 } from "lucide-react";
import { exportToCsv, exportToPdf } from "@/lib/utils";
import { format, startOfMonth } from "date-fns";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/auth/AuthProvider";
import { Badge } from "@/components/ui/badge";

type EarningStatementItem = {
  event_date: string;
  event_type: string;
  description: string;
  amount: number;
};

const fetchEarningsStatement = async (startDate: Date, endDate: Date): Promise<EarningStatementItem[]> => {
  const { data, error } = await supabase.rpc('get_my_earnings_statement', {
    p_start_date: format(startDate, 'yyyy-MM-dd'),
    p_end_date: format(endDate, 'yyyy-MM-dd'),
  });
  if (error) throw new Error(error.message);
  return data;
};

const Reports = () => {
  const { user } = useAuth();
  const [date, setDate] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: new Date(),
  });
  const [reportData, setReportData] = useState<EarningStatementItem[]>([]);

  const mutation = useMutation({
    mutationFn: (dateRange: DateRange) => fetchEarningsStatement(dateRange.from!, dateRange.to!),
    onSuccess: (data) => {
      setReportData(data);
      if (data.length === 0) {
        toast.info("No earnings found for the selected period.");
      }
    },
    onError: (error) => {
      toast.error(`Failed to generate report: ${error.message}`);
    },
  });

  const handleGenerateReport = () => {
    if (!date?.from || !date?.to) {
      toast.error("Please select a valid date range.");
      return;
    }
    mutation.mutate(date);
  };

  const handleExport = (formatType: 'csv' | 'pdf') => {
    if (reportData.length === 0) {
      toast.warning("No data to export. Please generate a report first.");
      return;
    }
    const filename = `SJA_Earnings_Statement_${format(date!.from!, 'yyyy-MM-dd')}_to_${format(date!.to!, 'yyyy-MM-dd')}`;
    const title = `Earnings Statement`;
    const headers = ["Date", "Type", "Description", "Amount (INR)"];
    const body = reportData.map(item => [
      format(new Date(item.event_date), 'PPP'),
      item.event_type,
      item.description,
      item.amount.toLocaleString('en-IN'),
    ]);
    if (formatType === 'csv') {
      exportToCsv(`${filename}.csv`, reportData.map(item => ({ ...item, event_date: format(new Date(item.event_date), 'yyyy-MM-dd') })));
    } else {
      exportToPdf(`${filename}.pdf`, title, headers, body, user?.user_metadata?.full_name || "User");
    }
    toast.success(`Report exported as ${formatType.toUpperCase()} successfully.`);
  };

  const totalEarnings = reportData.reduce((sum, item) => sum + item.amount, 0);

  return (
    <>
      <h1 className="text-3xl font-bold">My Reports</h1>
      <p className="text-muted-foreground">Generate and export statements of your earnings.</p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Earnings Statement Generator</CardTitle>
          <CardDescription>Select a date range to generate a report of your investment and commission earnings.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <DateRangePicker date={date} onDateChange={setDate} />
            <Button onClick={handleGenerateReport} disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Generate Report
            </Button>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">Report Results</h3>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="gap-1" onClick={() => handleExport('csv')} disabled={reportData.length === 0}>
                  <Download className="h-3.5 w-3.5" /> CSV
                </Button>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => handleExport('pdf')} disabled={reportData.length === 0}>
                  <Download className="h-3.5 w-3.5" /> PDF
                </Button>
              </div>
            </div>
            <div className="rounded-md border">
              <Table>
                <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                <TableBody>
                  {mutation.isPending ? (
                    [...Array(3)].map((_, i) => (<TableRow key={i}><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>))
                  ) : reportData.length > 0 ? (
                    reportData.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>{format(new Date(item.event_date), "PPP")}</TableCell>
                        <TableCell><Badge variant={item.event_type === 'Commission' ? 'secondary' : 'default'}>{item.event_type}</Badge></TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right font-mono text-green-600">+ ₹{item.amount.toLocaleString('en-IN')}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        <BarChart3 className="mx-auto h-12 w-12 text-muted-foreground" />
                        <p className="mt-2">No report generated. Select a date range and click "Generate Report".</p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
                {reportData.length > 0 && (
                  <TableFooter>
                    <TableRow className="bg-muted font-bold">
                      <TableCell colSpan={3}>Total Earnings</TableCell>
                      <TableCell className="text-right font-mono">₹{totalEarnings.toLocaleString('en-IN')}</TableCell>
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
};

export default Reports;