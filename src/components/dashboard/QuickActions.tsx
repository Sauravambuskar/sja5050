import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowDownToDot, TrendingUp, Users, User } from "lucide-react";
import { Link } from "react-router-dom";

const actions = [
  {
    title: "Deposit Funds",
    description: "Add money to your wallet.",
    icon: ArrowDownToDot,
    link: "/wallet?tab=deposit",
    variant: "default" as const,
  },
  {
    title: "Browse Plans",
    description: "Explore new investment opportunities.",
    icon: TrendingUp,
    link: "/investments",
    variant: "outline" as const,
  },
  {
    title: "Invite Friends",
    description: "Share your referral code.",
    icon: Users,
    link: "/referrals",
    variant: "outline" as const,
  },
  {
    title: "View Profile",
    description: "Update your personal details.",
    icon: User,
    link: "/profile",
    variant: "outline" as const,
  },
];

export const QuickActions = () => {
  return (
    <Card className="my-6">
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>
          Here are some common actions to get you started.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map((action) => (
          <Card key={action.title} className="flex flex-col justify-between p-4">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                <action.icon className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold">{action.title}</h3>
                <p className="text-sm text-muted-foreground">{action.description}</p>
              </div>
            </div>
            <Button asChild variant={action.variant} className="mt-4 w-full">
              <Link to={action.link}>{action.title}</Link>
            </Button>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
};