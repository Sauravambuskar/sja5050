import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ReferralClientLedgerItem } from "@/types/database";

interface ReferralClientLedgerTableProps {
  title?: string;
  description?: string;
  emptyMessage?: string;
  queryKey: readonly unknown[];
  queryFn: () => Promise<ReferralClientLedgerItem[]>;
}

const formatCurrency = (value: number) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

const getStatusVariant = (status: string) => {
  if (status === "active") return "default" as const;
  if (status === "completed" || status === "matured") return "secondary" as const;
  return "outline" as const;
};

const formatInvestmentId = (id: string) => {
  if (!id) return "—";
  return id.slice(0, 8).toUpperCase();
};

export default function ReferralClientLedgerTable({
  title = "Referral Ledger",
  description = "Live investment rows from your direct clients.",
  emptyMessage = "No referral investment records found yet.",
  queryKey,
  queryFn,
}: ReferralClientLedgerTableProps) {
  const [search, setSearch] = useState("");

  const { data, isLoading, isError, error } = useQuery<ReferralClientLedgerItem[]>({
    queryKey: [...queryKey],
    queryFn,
  });

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return data || [];

    return (data || []).filter((row) => {
      return [row.customer_name, row.customer_member_id, row.referral_member_id, row.investment_id]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term));
    });
  }, [data, search]);

  const totals = useMemo(() => {
    return filteredRows.reduce(
      (acc, row) => {
        acc.investment_amount += Number(row.investment_amount || 0);
        acc.monthly_return += Number(row.monthly_return || 0);
        acc.daily_return += Number(row.daily_return || 0);
        acc.payment += Number(row.payment || 0);
        return acc;
      },
      {
        investment_amount: 0,
        monthly_return: 0,
        daily_return: 0,
        payment: 0,
      }
    );
  }, [filteredRows]);

  return (
    <Card className="border-primary/20 shadow-sm">
      <CardHeader className="space-y-4 rounded-t-xl bg-gradient-to-r from-primary to-orange-400 text-primary-foreground">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="text-primary-foreground/85">{description}</CardDescription>
        </div>
        <div className="relative max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or client ID"
            className="border-white/40 bg-white text-foreground pl-9"
          />
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-orange-600/95 hover:bg-orange-600/95">
                <TableHead className="min-w-16 text-white">S.No</TableHead>
                <TableHead className="min-w-28 text-white">Referral ID</TableHead>
                <TableHead className="min-w-28 text-white">Customer ID</TableHead>
                <TableHead className="min-w-28 text-white">Date</TableHead>
                <TableHead className="min-w-48 text-white">Name</TableHead>
                <TableHead className="min-w-24 text-right text-white">Percentage</TableHead>
                <TableHead className="min-w-28 text-white">Investment ID</TableHead>
                <TableHead className="min-w-28 text-right text-white">Amount</TableHead>
                <TableHead className="min-w-24 text-right text-white">Monthly</TableHead>
                <TableHead className="min-w-24 text-right text-white">Daily</TableHead>
                <TableHead className="min-w-20 text-right text-white">Days</TableHead>
                <TableHead className="min-w-24 text-right text-white">Payment</TableHead>
                <TableHead className="min-w-24 text-white">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(4)].map((_, index) => (
                  <TableRow key={index}>
                    {Array.from({ length: 13 }).map((__, cellIndex) => (
                      <TableCell key={cellIndex}>
                        <Skeleton className="h-4 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={13} className="py-8 text-center text-destructive">
                    {error.message}
                  </TableCell>
                </TableRow>
              ) : filteredRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={13} className="py-10 text-center text-muted-foreground">
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {filteredRows.map((row, index) => (
                    <TableRow key={`${row.customer_user_id}-${row.investment_id}`}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{row.referral_member_id || "—"}</TableCell>
                      <TableCell>{row.customer_member_id || "—"}</TableCell>
                      <TableCell>
                        {row.investment_date ? format(new Date(row.investment_date), "yyyy-MM-dd") : "—"}
                      </TableCell>
                      <TableCell>{row.customer_name || "—"}</TableCell>
                      <TableCell className="text-right">{Number(row.commission_rate || 0)}%</TableCell>
                      <TableCell className="font-mono text-xs">{formatInvestmentId(row.investment_id)}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(row.investment_amount)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.monthly_return)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(row.daily_return)}</TableCell>
                      <TableCell className="text-right">{row.duration_days || 0}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(row.payment)}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(String(row.status || "").toLowerCase())}>
                          {row.status || "Unknown"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/40 font-semibold hover:bg-muted/40">
                    <TableCell>TOTAL</TableCell>
                    <TableCell>...</TableCell>
                    <TableCell>...</TableCell>
                    <TableCell>...</TableCell>
                    <TableCell>...</TableCell>
                    <TableCell className="text-right">...</TableCell>
                    <TableCell>...</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.investment_amount)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.monthly_return)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.daily_return)}</TableCell>
                    <TableCell className="text-right">...</TableCell>
                    <TableCell className="text-right">{formatCurrency(totals.payment)}</TableCell>
                    <TableCell>...</TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
