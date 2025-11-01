"use client";

import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { exportToPdf } from "@/lib/utils";
import { format, parse } from "date-fns";

type Receipt = {
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  member_id: string | null;
  investment_id: string;
  plan_name: string | null;
  investment_amount: number;
  monthly_profit: number;
  payout_month: string;
  paid_amount: number | null;
  payment_date: string | null;
  payment_mode: string | null;
  remarks: string | null;
  processed_by: string | null;
  processed_by_email: string | null;
  bank_account_holder_name: string | null;
  bank_account_number: string | null;
  bank_ifsc_code: string | null;
  platform_fee: number | null;
  edit_reason: string | null;
};

const fetchReceipt = async (investmentId: string, payoutMonth: string): Promise<Receipt | null> => {
  const monthDate = parse(payoutMonth + "-01", "yyyy-MM-dd", new Date());
  const { data, error } = await supabase.rpc("get_my_payout_receipt", {
    p_investment_id: investmentId,
    p_payout_month: format(monthDate, "yyyy-MM-01"),
  });
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return null;
  return data[0] as Receipt;
};

const ReceiptPayout = () => {
  const { investmentId, payoutMonth } = useParams<{ investmentId: string; payoutMonth: string }>();

  const { data: receipt, isLoading } = useQuery({
    queryKey: ["payoutReceiptUser", investmentId, payoutMonth],
    queryFn: () => fetchReceipt(investmentId!, payoutMonth!),
    enabled: !!investmentId && !!payoutMonth,
  });

  const handleDownloadPdf = () => {
    if (!receipt) return;
    const headers = ["Field", "Value"];
    const body: (string | number)[][] = [
      ["Member ID", receipt.member_id || "N/A"],
      ["Name", receipt.user_name || "N/A"],
      ["Email", receipt.user_email || "N/A"],
      ["Plan", receipt.plan_name || "N/A"],
      ["Investment Amount", `₹${receipt.investment_amount.toLocaleString("en-IN")}`],
      ["Monthly Profit", `₹${receipt.monthly_profit.toLocaleString("en-IN")}`],
      ["Payout Month", format(parse(payoutMonth! + "-01", "yyyy-MM-dd", new Date()), "MMMM yyyy")],
      ["Paid Amount", `₹${(receipt.paid_amount ?? 0).toLocaleString("en-IN")}`],
      ["Platform Fee", `₹${(receipt.platform_fee ?? 0).toLocaleString("en-IN")}`],
      ["Payment Date", receipt.payment_date ? format(new Date(receipt.payment_date), "PPpp") : "—"],
      ["Payment Mode", receipt.payment_mode || "—"],
      ["Remarks", receipt.remarks || "—"],
      ["Edit Reason", receipt.edit_reason || "—"],
      ["Processed By", receipt.processed_by_email || "—"],
      ["Bank Holder", receipt.bank_account_holder_name || "—"],
      ["Bank Account", receipt.bank_account_number || "—"],
      ["IFSC", receipt.bank_ifsc_code || "—"],
    ];
    const title = `Payout Receipt - ${format(parse(payoutMonth! + "-01", "yyyy-MM-dd", new Date()), "MMMM yyyy")}`;
    exportToPdf(`Payout_Receipt_${payoutMonth}.pdf`, title, headers, body, receipt.user_name || "User");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Payout Receipt</h1>
        <p className="text-muted-foreground">Detailed receipt for your monthly payout.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Receipt</CardTitle>
          <CardDescription>Review and download your payout receipt for records.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          ) : !receipt ? (
            <div className="text-center text-muted-foreground">Receipt not found.</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Member</p>
                  <p className="font-medium">{receipt.user_name} ({receipt.member_id || "N/A"})</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Plan</p>
                  <p className="font-medium">{receipt.plan_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payout Month</p>
                  <p className="font-medium">{format(parse(payoutMonth! + "-01", "yyyy-MM-dd", new Date()), "MMMM yyyy")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Paid Amount</p>
                  <p className="font-medium">₹{(receipt.paid_amount ?? 0).toLocaleString("en-IN")}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Mode</p>
                  <p className="font-medium">{receipt.payment_mode || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Date</p>
                  <p className="font-medium">{receipt.payment_date ? format(new Date(receipt.payment_date), "PPpp") : "—"}</p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Bank Account</p>
                  <p className="font-mono">{receipt.bank_account_holder_name || "—"}</p>
                  <p className="font-mono">{receipt.bank_account_number || "—"}</p>
                  <p className="font-mono">{receipt.bank_ifsc_code || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Processed By</p>
                  <p className="font-medium">{receipt.processed_by_email || "—"}</p>
                  <p className="text-sm text-muted-foreground">Remarks</p>
                  <p className="font-mono">{receipt.remarks || "—"}</p>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-sm text-muted-foreground">Platform Fee</p>
                      <p className="font-medium">₹{(receipt.platform_fee ?? 0).toLocaleString("en-IN")}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Edit Reason</p>
                      <p className="font-mono">{receipt.edit_reason || "—"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button variant="outline" onClick={handleDownloadPdf}>Download PDF</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReceiptPayout;