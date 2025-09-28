import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { TrendingUp } from "lucide-react";

type ActiveInvestment = {
  id: string;
  plan_name: string;
  investment_amount: number;
  start_date: string;
  maturity_date: string;
  status: string;
};

const fetchActiveInvestments = async (): Promise<ActiveInvestment[]> => {
  const { data, error } = await supabase.rpc('get_my_active_investments_for_withdrawal');
  if (error) {
    console.error("Error fetching active investments:", error);
    throw new Error(error.message);
  }
  return data || [];
};

export const MyInvestments = () => {
  const { data: investments, isLoading } = useQuery<ActiveInvestment[]>({
    queryKey: ['myActiveInvestments'],
    queryFn: fetchActiveInvestments,
  });

  if (isLoading) {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-4">My Investments</h2>
        <div className="flex space-x-4 overflow-hidden">
          <Skeleton className="h-40 w-64 rounded-lg" />
          <Skeleton className="h-40 w-64 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!investments || investments.length === 0) {
    return (
      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-4">My Investments</h2>
        <Card className="text-center border-dashed">
          <CardHeader>
            <CardTitle>Start Your Investment Journey</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">You don't have any active investments yet.</p>
            <Button asChild>
              <Link to="/investments">Browse Investment Plans</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-4">My Investments</h2>
      <Carousel
        opts={{
          align: "start",
          loop: false,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-4">
          {investments.map((investment) => (
            <CarouselItem key={investment.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
              <Card className="bg-primary/5 border-primary/20 h-full flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{investment.plan_name}</span>
                    <TrendingUp className="h-5 w-5 text-primary" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-grow flex flex-col justify-end">
                  <div className="text-2xl font-bold">
                    ₹{investment.investment_amount.toLocaleString('en-IN')}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Matures on {format(new Date(investment.maturity_date), "dd MMM yyyy")}
                  </p>
                </CardContent>
              </Card>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden sm:flex" />
        <CarouselNext className="hidden sm:flex" />
      </Carousel>
    </div>
  );
};