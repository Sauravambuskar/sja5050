import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, CreditCard, DollarSign, Users } from "lucide-react";

const kpiData = [
  { title: "Today's Income", value: "₹1,250.00", icon: DollarSign, change: "+5.2% from yesterday" },
  { title: "Active Investments", value: "12", icon: Activity, change: "+2 since last week" },
  { title: "New Referrals", value: "3", icon: Users, change: "this month" },
  { title: "Pending KYC", value: "1", icon: CreditCard, change: "needs review" },
];

const Dashboard = () => {
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </div>
      <p className="text-muted-foreground">
        Here's a summary of your portfolio and activities.
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-muted-foreground">{kpi.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6">
        <h2 className="text-2xl font-bold">Recent Transactions</h2>
        <div className="mt-4 rounded-lg border bg-card p-8 text-center text-muted-foreground">
          Transaction history will be displayed here.
        </div>
      </div>
    </>
  );
};

export default Dashboard;