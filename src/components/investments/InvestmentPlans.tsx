import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { InvestmentPlan } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";

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
  const { data: plans, isLoading, isError, error } = useQuery<InvestmentPlan[]>({
    queryKey: ['investmentPlans'],
    queryFn: fetchInvestmentPlans,
  });

  if (isLoading) {
    return (
      <div className="grid gap-6 pt-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 mt-1 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-1/3 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
            <CardFooter>
              <Skeleton className="h-10 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (isError) {
    return <div className="mt-4 rounded-md border border-destructive bg-destructive/10 p-4 text-destructive-foreground">Error: {error.message}</div>;
  }

  return (
    <div className="grid gap-6 pt-4 md:grid-cols-2 lg:grid-cols-4">
      {plans?.map((plan) => (
        <Card key={plan.id}>
          <CardHeader>
            <CardTitle>{plan.name}</CardTitle>
            <CardDescription>{plan.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{plan.annual_rate}%</div>
            <p className="text-sm text-muted-foreground">Annually for {plan.duration_months} Months</p>
          </CardContent>
          <CardFooter>
            <Button className="w-full">Invest Now</Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};

export default InvestmentPlans;