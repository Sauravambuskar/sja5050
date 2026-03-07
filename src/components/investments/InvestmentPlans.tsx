import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { InvestmentPlan } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { InvestDialog } from "./InvestDialog";
import { TrendingUp } from "lucide-react";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { useNavigate } from "react-router-dom";

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

const InvestmentPlans = ({ canInvest }: { canInvest: boolean }) => {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<InvestmentPlan | null>(null);
  const { data: plans, isLoading, isError, error } = useQuery<InvestmentPlan[]>({
    queryKey: ['investmentPlans'],
    queryFn: fetchInvestmentPlans,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 pt-4 md:grid-cols-2 xl:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-80 w-full" />
        ))}
      </div>
    );
  }

  if (isError) {
    return <div className="mt-4 rounded-md border border-destructive bg-destructive/10 p-4 text-destructive-foreground">Error: {error.message}</div>;
  }

  if (!plans || plans.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/50 bg-muted/20 p-12 text-center">
        <TrendingUp className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="mt-4 text-lg font-semibold">No Active Investment Plans</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          There are currently no investment plans available. Please check back later.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-6 pt-4 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => {
          const monthlyRate = plan.annual_rate / 12;
          return (
            <Card key={plan.id} className="flex flex-col">
              <CardHeader className="p-0">
                <AspectRatio ratio={16 / 9}>
                  <img
                    src={plan.image_url || '/placeholder.svg'}
                    alt={plan.name}
                    className="object-cover w-full h-full rounded-t-lg"
                  />
                </AspectRatio>
                <div className="p-6 pb-0">
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex-grow p-6">
                <div className="text-3xl font-bold">{monthlyRate.toFixed(2)}%</div>
                <p className="text-sm text-muted-foreground">
                  Monthly Return for {plan.duration_months} Months
                </p>
                <p className="text-sm font-semibold mt-2">
                  ₹{plan.min_investment.toLocaleString('en-IN')} - ₹{plan.max_investment?.toLocaleString('en-IN') ?? 'Unlimited'}
                </p>
              </CardContent>
              <CardFooter className="p-6 pt-0">
                <Button
                  className="w-full"
                  onClick={() => {
                    if (!canInvest) {
                      navigate('/agreement');
                      return;
                    }
                    setSelectedPlan(plan);
                  }}
                >
                  Deposit Now
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
      {selectedPlan && canInvest && (
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