import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const withdrawalHistory = [
    { id: "WTH001", amount: "₹5,000", date: "2024-07-10", status: "Completed" },
    { id: "WTH002", amount: "₹2,500", date: "2024-05-22", status: "Completed" },
    { id: "WTH003", amount: "₹10,000", date: "2024-08-01", status: "Pending" },
];

const WithdrawalRequests = () => {
  return (
    <div className="grid gap-6 pt-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Request a Withdrawal</CardTitle>
          <CardDescription>Enter the amount you wish to withdraw from your wallet.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹)</Label>
            <Input id="amount" type="number" placeholder="e.g., 5000" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pin">Transaction PIN</Label>
            <Input id="pin" type="password" placeholder="Enter your 4-digit PIN" />
          </div>
          <Button className="w-full">Submit Request</Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal History</CardTitle>
          <CardDescription>Your recent withdrawal requests.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Amount</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {withdrawalHistory.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">{req.amount}</TableCell>
                  <TableCell>{req.date}</TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={
                        req.status === "Completed"
                          ? "default"
                          : req.status === "Pending"
                          ? "outline"
                          : "destructive"
                      }
                    >
                      {req.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default WithdrawalRequests;