"use client";

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { PayoutReportItem } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, Loader2, FileSpreadsheet } from 'lucide-react';
import { exportToCsv, exportToPdf } from '@/lib/utils';
import { toast } from 'sonner';
import { DateRange } from 'react-day-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { startOfMonth, endOfMonth, format } from 'date-fns';

const fetchPayoutReport = async (startDate: Date, endDate: Date): Promise<PayoutReportItem[]> => {
  const { data, error } = await supabase.rpc('get_payout_report', {
    start_date_filter: format(startDate, 'yyyy-MM-dd'),
    end_date_filter: format(endDate, 'yyyy-MM-dd'),
  });
  if (error) throw new Error(error.message);
  return data || [];
};

const FinancialReporting = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [isReportGenerated, setIsReportGenerated] = useState(false);

  const { data: reportData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['payoutReport', dateRange],
    queryFn: () => {
      if (!dateRange?.from || !dateRange?.to) {
        return Promise.resolve([]);
      }
      setIsReportGenerated(true);
      return fetchPayoutReport(dateRange.from, dateRange.to);
    },
    enabled: false,
  });

  const handleGenerateReport = () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast.error('Please select a valid date range.');
      return;
    }
    refetch();
  };

  const handleDownloadCsv = () => {
    if (!reportData) return;
    const dataForCsv = reportData.map(item => ({
      'User Name': item.user_name,
      'User ID': item.user_id,
      'Investment ID': item.investment_id,
      'Plan Name': item.plan_name,
      'Investment Amount': item.investment_amount,
      'Monthly Profit': item.monthly_profit,
      'Bank Holder Name': item.bank_account_holder_name,
      'Bank Account Number': item.bank_account_number,
      'Bank IFSC': item.bank_ifsc_code,
      'Status': item.status,
      'Start Date': item.start_date,
      'Maturity Date': item.maturity_date,
    }));
    exportToCsv(`Direct_Payment_Report_${format(new Date(), 'yyyy-MM-dd')}.csv`, dataForCsv);
  };

  const handleDownloadPdf = () => {
    if (!reportData || !dateRange?.from || !dateRange.to) return;
    const headers = ['User Name', 'Investment ID', 'Plan Name', 'Investment Amount', 'Monthly Profit', 'Bank Account'];
    const dataForPdf = reportData.map(item => [
      item.user_name,
      item.investment_id.substring(0, 8),
      item.plan_name,
      `₹${item.investment_amount.toLocaleString('en-IN')}`,
      `₹${item.monthly_profit.toLocaleString('en-IN')}`,
      `${item.bank_account_holder_name || ''}\n${item.bank_account_number || ''}\n${item.bank_ifsc_code || ''}`
    ]);
    const title = `Direct Payment Distribution Report (${format(dateRange.from, 'PPP')} - ${format(dateRange.to, 'PPP')})`;
    exportToPdf(`Direct_Payment_Report_${format(new Date(), 'yyyy-MM-dd')}.pdf`, title, headers, dataForPdf, 'Admin');
  };

  const isGenerating = isLoading || isFetching;

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Financial Reporting</h1>
          <p className="text-muted-foreground">
            Generate and download direct payment distribution reports.
          </p>
        </div>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Direct Payment Distribution Report</CardTitle>
          <CardDescription>
            Select a date range to generate a report of all monthly profits due to investors for that period.
            This report is based on active investments within the selected timeframe.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="grid flex-1 gap-2">
              <label className="text-sm font-medium">Date Range</label>
              <DateRangePicker date={dateRange} onDateChange={setDateRange} />
            </div>
            <Button onClick={handleGenerateReport} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
              Generate Report
            </Button>
          </div>

          {isGenerating && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {isReportGenerated && !isGenerating && reportData && (
            <div>
              <div className="flex items-center justify-between py-4">
                <h3 className="text-lg font-semibold">
                  Report Results ({reportData.length} records)
                </h3>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleDownloadCsv} disabled={reportData.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Download CSV
                  </Button>
                  <Button variant="outline" onClick={handleDownloadPdf} disabled={reportData.length === 0}>
                    <Download className="mr-2 h-4 w-4" />
                    Download PDF
                  </Button>
                </div>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead className="text-right">Investment Amount</TableHead>
                      <TableHead className="text-right">Monthly Profit</TableHead>
                      <TableHead>Bank Details</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.length > 0 ? (
                      reportData.map((item) => (
                        <TableRow key={item.investment_id}>
                          <TableCell>
                            <div className="font-medium">{item.user_name}</div>
                            <div className="text-xs text-muted-foreground">{item.user_id}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{item.plan_name}</div>
                            <div className="text-xs text-muted-foreground">Inv ID: {item.investment_id.substring(0, 8)}...</div>
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            ₹{item.investment_amount.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-green-600">
                            ₹{item.monthly_profit.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{item.bank_account_holder_name}</div>
                            <div className="text-xs text-muted-foreground">{item.bank_account_number}</div>
                            <div className="text-xs text-muted-foreground">{item.bank_ifsc_code}</div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{item.status}</span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center">
                          No records found for the selected date range.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
};

export default FinancialReporting;