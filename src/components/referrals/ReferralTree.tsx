import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const referrals = [
  { id: "USR004", name: "Alice Smith", joinDate: "2024-07-15", level: 1, status: "Active" },
  { id: "USR005", name: "Charlie Brown", joinDate: "2024-07-10", level: 1, status: "Active" },
  { id: "USR006", name: "David Williams", joinDate: "2024-06-22", level: 1, status: "KYC Pending" },
  { id: "USR007", name: "Bob Johnson (from Alice)", joinDate: "2024-07-20", level: 2, status: "Active" },
];

const ReferralTree = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Referral Tree</CardTitle>
        <CardDescription>
          View your network of referrals. A full graphical tree view will be available soon.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Join Date</TableHead>
              <TableHead>Level</TableHead>
              <TableHead className="text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {referrals.map((referral) => (
              <TableRow key={referral.id}>
                <TableCell className="font-medium">{referral.name}</TableCell>
                <TableCell>{referral.joinDate}</TableCell>
                <TableCell>
                  <Badge variant="secondary">Level {referral.level}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={referral.status === "Active" ? "default" : "outline"}>
                    {referral.status}
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

export default ReferralTree;