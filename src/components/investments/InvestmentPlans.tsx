import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const plans = [
  { name: "Starter Growth", rate: "8% Annually", duration: "12 Months", min: "₹10,000" },
  { name: "Steady Income", rate: "10% Annually", duration: "24 Months", min: "₹50,000" },
  { name: "Wealth Builder", rate: "12% Annually", duration: "36 Months", min: "₹1,00,000" },
  { name: "Retirement Plus", rate: "15% Annually", duration: "60 Months", min: "₹5,00,000" },
];

const InvestmentPlans = () => {
  return (
    <div className="grid gap-6 pt-4 md:grid-cols-2 lg:grid-cols-4">
      {plans.map((plan) => (
        <Card key={plan.name}>
          <CardHeader>
            <CardTitle>{plan.name}</CardTitle>
            <CardDescription>Minimum Investment: {plan.min}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{plan.rate}</div>
            <p className="text-sm text-muted-foreground">for {plan.duration}</p>
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