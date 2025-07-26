import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal } from "lucide-react";

const kycSubmissions = [
  { id: "KYC001", userName: "Alice Johnson", userEmail: "alice.j@example.com", submissionDate: "2024-08-05", status: "Pending" },
  { id: "KYC002", userName: "David Williams", userEmail: "david.w@example.com", submissionDate: "2024-08-04", status: "Pending" },
  { id: "KYC003", userName: "Eva Green", userEmail: "eva.g@example.com", submissionDate: "2024-08-02", status: "Approved" },
  { id: "KYC004", userName: "Frank Miller", userEmail: "frank.m@example.com", submissionDate: "2024-08-01", status: "Rejected" },
];

const KycManagement = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>KYC Toolkit</CardTitle>
        <CardDescription>Review and process client KYC submissions.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Submission Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {kycSubmissions.map((submission) => (
              <TableRow key={submission.id}>
                <TableCell>
                  <div className="font-medium">{submission.userName}</div>
                  <div className="text-sm text-muted-foreground">{submission.userEmail}</div>
                </TableCell>
                <TableCell>{submission.submissionDate}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      submission.status === "Approved"
                        ? "default"
                        : submission.status === "Pending"
                        ? "outline"
                        : "destructive"
                    }
                  >
                    {submission.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Documents</DropdownMenuItem>
                      <DropdownMenuItem>Approve</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">Reject</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
export default KycManagement;