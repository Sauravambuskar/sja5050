import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, UserCheck, Hourglass } from "lucide-react";

const kpiData = [
  { title: "Total Users", value: "1,258", icon: Users, change: "+12 since yesterday" },
  { title: "Assets Under Management (AUM)", value: "₹12.5 Cr", icon: DollarSign, change: "+0.5% this week" },
  { title: "Pending KYC Verifications", value: "15", icon: UserCheck, change: "3 new today" },
  { title: "Pending Withdrawals", value: "8", icon: Hourglass, change: "Totaling ₹2.1 Lakh" },
];

const AdminDashboard = () => {
  return (
    <>
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      <p className="text-muted-foreground">Overview of platform KPIs and activities.</p>
      
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

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Registrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
              List of recently joined users will appear here.
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>High-Value Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
              Feed of significant transactions will appear here.
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
};
export default AdminDashboard;