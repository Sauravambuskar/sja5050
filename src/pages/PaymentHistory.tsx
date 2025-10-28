"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { exportToPdf } from "@/lib/utils";
import { Link } from "react-router-dom";
import { format, parse } from "date-fns";
import { showError, showSuccess } from "@/utils/toast";
import useLedgerSync from "@/hooks/useLedgerSync";

type PayoutRow = {
  investment_id: string;
  plan_name: string;
  payout_month: string;
  status: string;
  paid_amount: number | null;
  payment_date: string | null;
  payment_mode: string | null;
  remarks: string | null;
};

const pageSize = 10;

const PaymentHistory = () => {
  const [status, setStatus] = useState<string>("All");
  const [month, setMonth] = useState<string>(""); // YYYY-MM
  const [page, setPage] = useState<number>(0);

  useLedgerSync();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["myPayoutHistory", status, month, page],
    queryFn: async (): Promise<PayoutRow[]> => {
      const params: Record<string, any> = {
        page_limit: pageSize,
        page_offset: page * pageSize,
      };
      if (status !== "All") params.status_filter = status;
      if (month) params.month_filter = format(parse(month + "-01", "yyyy-MM-dd", new Date()), "yyyy-MM-01");

      const { data, error } = await supabase.rpc("get_my_payout_history", params);
      if (error) throw new Error(error.message);
      return (data ?? []) as PayoutRow[];
    },
  });

  const onDownload = async (investmentId: string, payoutMonth: string) => {
    try {
      const monthDate = parse(payoutMonth + "-01", "yyyy-MM-dd", new Date());
      const { data, error } = await supabase.rpc("get_my_payout_receipt", {
        p_investment_id: investmentId,
        p_payout_month: format(monthDate, "yyyy-MM-01"),
      });
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) throw new Error("Receipt not found.");

      const r = data[0] as any;
      const headers = ["Field", "Value"];
      const body: (string | number)[][] = [
        ["Member ID", r.member_id || "N/A"],
        ["Name", r.user_name || "N/A"],
        ["Email", r.user_email || "N/A"],
        ["Plan", r.plan_name || "N/A"],
        ["Investment Amount", `₹${r.investment_amount.toLocaleString("en-IN")}`],
        ["Monthly Profit", `₹${r.monthly_profit.toLocaleString("en-IN")}`],
        ["Payout Month", format(monthDate, "MMMM yyyy")],
        ["Paid Amount", `₹${(r.paid_amount ?? 0).toLocaleString("en-IN")}`],
        ["Payment Date", r.payment_date ? format(new Date(r.payment_date), "PPpp") : "—"],
        ["Payment Mode", r.payment_mode || "—"],
        ["Remarks", r.remarks || "—"],
        ["Processed By", r.processed_by_email || "—"],
        ["Bank Holder", r.bank_account_holder_name || "—"],
        ["Bank Account", r.bank_account_number || "—"],
        ["IFSC", r.bank_ifsc_code || "—"],
      ];
      const title = `Payout Receipt - ${format(monthDate, "MMMM yyyy")}`;
      exportToPdf(`Payout_Receipt_${format(monthDate, "yyyy-MM")}.pdf`, title, headers, body, r.user_name || "User");
      showSuccess("PDF downloaded.");
    } catch (e) {
      showError(e instanceof Error ? e.message : "Failed to download PDF");
    }
  };

  const rows = data ?? [];
  const hasRows = rows.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payment History</h1>
        <p className="text-muted-foreground">Your monthly payout records with receipts.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter by status or month.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={status}
                onChange={(e) => { setStatus(e.target.value); setPage(0); }}
                className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
              >
                <option>All</option>
                <option>Paid</option>
                <option>Pending</option>
              </select>
            </div>
            <div>
              <Label htmlFor="month">Month</Label>
              <Input
                id="month"
                type="month"
                value={month}
                onChange={(e) => { setMonth(e.target.value); setPage(0); }}
                className="mt-2"
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={() => refetch()}>Apply</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payouts</CardTitle>
          <CardDescription>View details or download receipt PDFs.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Month</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Paid Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} className="h-20 text-center">Loading...</TableCell></TableRow>
              ) : !hasRows ? (
                <TableRow><TableCell colSpan={5} className="h-20 text-center text-muted-foreground">No payouts found.</TableCell></TableRow>
              ) : (
                rows.map((row) => {
                  return (
                    <TableRow key={`${row.investment_id}-${row.payout_month}`}>
                      <TableCell>{row.plan_name}</TableCell>
                      <TableCell>{format(new Date(row.payout_month as unknown as string), "MMM yyyy")}</TableCell>
                      <TableCell>
                        <Badge variant={row.status === "Paid" ? "success" : "secondary"}>{row.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{row.paid_amount != null ? `₹${row.paid_amount.toLocaleString("en-IN")}` : "—"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Link to={`/receipts/payout/${row.investment_id}/${row.payout_month}`}>
                            <Button variant="outline" size="sm">View Receipt</Button>
                          </Link>
                          <Button variant="ghost" size="sm" onClick={() => onDownload(row.investment_id, row.payout_month)}>
                            Download PDF
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          <div className="mt-4 flex items-center justify-between">
            <Button variant="outline" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>Previous</Button>
            <div className="text-sm text-muted-foreground">Page {page + 1}</div>
            <Button variant="outline" onClick={() => setPage((p) => p + 1)} disabled={!hasRows || rows.length < pageSize}>Next</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentHistory;