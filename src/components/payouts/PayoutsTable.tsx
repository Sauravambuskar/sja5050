import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { CommissionHistoryItem } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { toast } from "sonner";

const fetchCommissionHistory = async (): Promise<CommissionHistoryItem[]> => {
  const { data, error } = await supabase.rpc('get_my_commission_history');
  if (error) throw new Error(error.message);
  return data || [];
};

const PayoutsTable = () => {
  const { data: payouts, isLoading } = useQuery<CommissionHistoryItem[]>({
    queryKey: ['myPayoutHistory'],
    queryFn: fetchCommissionHistory,
  });

  const ADMIN_FEE_RATE = 0.10; // 10%
  const TDS_RATE = 0.00; // 0%

  const processedPayouts = (payouts || []).map(payout => {
    const gross = payout.amount;
    const adminFee = gross * ADMIN_FEE_RATE;
    const tds = gross * TDS_RATE;
    const bank = gross - adminFee - tds;
    return {
      ...payout,
      gross,
      adminFee,
      tds,
      bank,
    };
  });

  const totals = processedPayouts?.reduce((acc, payout) => {
    acc.gross += payout.gross;
    acc.adminFee += payout.adminFee;
    acc.tds += payout.tds;
    acc.bank += payout.bank;
    return acc;
  }, { gross: 0, adminFee: 0, tds: 0, bank: 0 });

  const handleViewSlip = () => {
    toast.info("Payout slip generation is coming soon!");
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payout History</CardTitle>
        <CardDescription>
          Your commission payouts after deductions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Sr. No.</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Payout No.</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Gross</TableHead>
              <TableHead className="text-right">TDS</TableHead>
              <TableHead className="text-right">Admin</TableHead>
              <TableHead className="text-right">Bank</TableHead>
              <TableHead className="text-center">View Slip</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-full" /></TableCell>
                </TableRow>
              ))
            ) : processedPayouts && processedPayouts.length > 0 ? (
              processedPayouts.map((payout, index) => (
                <TableRow key={payout.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>Level Bonus</TableCell>
                  <TableCell>{payout.id.substring(0, 8)}</TableCell>
                  <TableCell>{format(new Date(payout.payout_date), "dd-MM-yyyy")}</TableCell>
                  <TableCell className="text-right">{formatCurrency(payout.gross)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(payout.tds)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(payout.adminFee)}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(payout.bank)}</TableCell>
                  <TableCell className="text-center">
                    <Button variant="link" className="h-auto p-0 text-primary" onClick={handleViewSlip}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  No payout history found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {processedPayouts && processedPayouts.length > 0 && totals && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={4} className="font-bold text-right">Total</TableCell>
                <TableCell className="text-right font-bold">{formatCurrency(totals.gross)}</TableCell>
                <TableCell className="text-right font-bold">{formatCurrency(totals.tds)}</TableCell>
                <TableCell className="text-right font-bold">{formatCurrency(totals.adminFee)}</TableCell>
                <TableCell className="text-right font-bold">{formatCurrency(totals.bank)}</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </CardContent>
    </Card>
  );
};

export default PayoutsTable;