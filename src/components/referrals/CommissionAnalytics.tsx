import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Users } from "lucide-react";

const commissionHistory = [
  { id: "COM001", from: "Alice Smith", amount: "₹500", date: "2024-08-01", level: 1, status: "Paid" },
  { id: "COM002", from: "Bob Johnson", amount: "₹250", date: "2024-07-28", level: 2, status: "Paid" },
  { id: "COM003", from: "Charlie Brown", amount: "₹1,200", date: "2024-07-25", level: 1, status: "Paid" },
];

const CommissionAnalytics = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Commission Analytics</CardTitle>
        <CardDescription>An overview of your referral earnings.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Commission Earned</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹15,750.00</div>
              <p className="text-xs text-muted-foreground">+₹1,950 this month</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">28</div>
              <p className="text-xs text-muted-foreground">+3 this month</p>
            </CardContent>
          </Card>
        </div>
        <div>
          <h3 className="text-lg font-medium">Commission History</h3>
          <div className="mt-4 rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>From User</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commissionHistory.map((commission) => (
                  <TableRow key={commission.id}>
                    <TableCell className="font-medium">{commission.from}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">Lvl {commission.level}</Badge>
                    </TableCell>
                    <TableCell>{commission.amount}</TableCell>
                    <TableCell>{commission.date}</TableCell>
                    <TableCell className="text-right">
                      <Badge>{commission.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CommissionAnalytics;