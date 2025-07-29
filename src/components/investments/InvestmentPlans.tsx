import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { InvestmentPlan } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { InvestDialog } from "./InvestDialog";

const fetchInvestmentPlans = async (): Promise<InvestmentPlan[]> => {
  const { data, error } = await supabase
    .from('investment_plans')
    .select('*')
    .eq('is_active', true)
    .order('min_investment', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }
  return data;
};

const InvestmentPlans = () => {
  const [selectedPlan, setSelectedPlan] = useState<InvestmentPlan | null>(null);
  const { data: plans, isLoading, isError, error } = useQuery<InvestmentPlan[]>({
    queryKey: ['investmentPlans'],
    queryFn: fetchInvestmentPlans,
  });

  if (isLoading) {
    return (
      <div className="grid gap-6 pt-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Card key={i}><CardHeader><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 mt-1 w-1/2" /></CardHeader><CardContent><Skeleton className="h-8 w-1/3 mb-2" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-5 w-full mt-2" /></CardContent><CardFooter><Skeleton className="h-10 w-full" /></CardFooter></Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return <div className="mt-4 rounded-md border border-destructive bg-destructive/10 p-4 text-destructive-foreground">Error: {error.message}</div>;
  }

  return (
    <>
      <div className="grid gap-6 pt-4 md:grid-cols-2 lg:grid-cols-3">
        {plans?.map((plan) => {
          const monthlyRate = plan.annual_rate / 12;
          return (
            <Card key={plan.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <div className="text-3xl font-bold">{monthlyRate.toFixed(2)}%</div>
                <p className="text-sm text-muted-foreground">
                  Monthly Return for {plan.duration_months} Months
                </p>
                <p className="text-sm font-semibold mt-2">
                  ₹{plan.min_investment.toLocaleString('en-IN')} - ₹{plan.max_investment?.toLocaleString('en-IN') ?? 'Unlimited'}
                </p>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => setSelectedPlan(plan)}>Deposit Now</Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
      {selectedPlan && (
        <InvestDialog
          plan={selectedPlan}
          isOpen={!!selectedPlan}
          onClose={() => setSelectedPlan(null)}
        />
      )}
    </>
  );
};

export default InvestmentPlans;