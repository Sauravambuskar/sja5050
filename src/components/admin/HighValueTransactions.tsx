import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { ArrowDownToDot, TrendingUp } from "lucide-react";
import { usePageLayoutContext } from "@/components/layout/PageLayout";
import { AdminHighValueTransaction } from "@/types/database";

const fetchHighValueTransactions = async (): Promise<AdminHighValueTransaction[]> => {
  const { data, error } = await supabase.rpc('get_high_value_transactions');
  if (error) throw new Error(error.message);
  return data;
};

export const HighValueTransactions = () => {
  const { handleViewUser } = usePageLayoutContext();
  const { data: transactions, isLoading } = useQuery<AdminHighValueTransaction[]>({
    queryKey: ['highValueTransactions'],
    queryFn: fetchHighValueTransactions,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>High-Value Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : transactions && transactions.length > 0 ? (
          <div className="space-y-4">
            {transactions.map((item) => (
              <button key={item.id} className="flex w-full items-start gap-4 rounded-md p-2 text-left transition-colors hover:bg-accent" onClick={() => handleViewUser(item.user_id)}>
                <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted">
                  {item.type === 'Deposit' ? <ArrowDownToDot className="h-5 w-5 text-blue-500" /> : <TrendingUp className="h-5 w-5 text-green-500" />}
                </div>
                <div className="flex-grow">
                  <p className="text-sm">
                    <span className="font-semibold">{item.user_name}</span> made a {item.type.toLowerCase()} of <span className="font-semibold">₹{item.amount.toLocaleString('en-IN')}</span>.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
            No high-value transactions to display.
          </div>
        )}
      </CardContent>
    </Card>
  );
};