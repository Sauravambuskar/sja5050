import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const investmentHistory = [
  { id: "INV001", plan: "Starter Growth", amount: "₹25,000", startDate: "2023-01-15", maturityDate: "2024-01-15", status: "Matured" },
  { id: "INV002", plan: "Wealth Builder", amount: "₹1,50,000", startDate: "2023-06-20", maturityDate: "2026-06-20", status: "Active" },
  { id: "INV003", plan: "Steady Income", amount: "₹75,000", startDate: "2024-02-10", maturityDate: "2026-02-10", status: "Active" },
];

const InvestmentHistory = () => {
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>My Investment Portfolio</CardTitle>
        <CardDescription>A record of all your active and past investments.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan Name</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Start Date</TableHead>
              <TableHead>Maturity Date</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {investmentHistory.map((investment) => (
              <TableRow key={investment.id}>
                <TableCell className="font-medium">{investment.plan}</TableCell>
                <TableCell>{investment.amount}</TableCell>
                <TableCell>{investment.startDate}</TableCell>
                <TableCell>{investment.maturityDate}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={investment.status === "Active" ? "default" : "secondary"}>
                    {investment.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default InvestmentHistory;