import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Transaction } from "@/types/database";
import { ArrowRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../ui/button";

const fetchRecentTransactions = async (): Promise<Transaction[]> => {
  const { data, error } = await supabase.rpc('get_my_transactions', {
    page_limit: 5,
    page_offset: 0,
  });
  if (error) throw new Error(error.message);
  return data;
};

export function RecentTransactions() {
  const { data: transactions, isLoading } = useQuery<Transaction[]>({
    queryKey: ['recentTransactions'],
    queryFn: fetchRecentTransactions,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>Your last 5 transactions.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : (
          <div className="space-y-4">
            {transactions?.map((tx) => (
              <div key={tx.id} className="flex items-center">
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">{tx.description || tx.type}</p>
                  <p className="text-sm text-muted-foreground">{new Date(tx.created_at).toLocaleDateString()}</p>
                </div>
                <div className={`font-medium ${tx.amount > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {tx.amount > 0 ? '+' : ''}₹{tx.amount.toLocaleString()}
                </div>
              </div>
            ))}
             <Button asChild variant="outline" className="w-full mt-4">
                <Link to="/transactions">
                    View All Transactions <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}