import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, CheckCircle, XCircle } from "lucide-react";

const kycRequests = [
  { id: "KYC001", name: "Alice Johnson", submittedDate: "2024-08-05", status: "Pending" },
  { id: "KYC002", name: "David Williams", submittedDate: "2024-08-04", status: "Pending" },
  { id: "KYC003", name: "Eve Davis", submittedDate: "2024-08-02", status: "Approved" },
  { id: "KYC004", name: "Frank Miller", submittedDate: "2024-08-01", status: "Rejected" },
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
              <TableHead>User Name</TableHead>
              <TableHead>Submitted Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {kycRequests.map((request) => (
              <TableRow key={request.id}>
                <TableCell className="font-medium">{request.name}</TableCell>
                <TableCell>{request.submittedDate}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      request.status === "Approved"
                        ? "default"
                        : request.status === "Pending"
                        ? "outline"
                        : "destructive"
                    }
                  >
                    {request.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Toggle menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>View Documents</DropdownMenuItem>
                      <DropdownMenuItem className="text-green-600">
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600">
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </DropdownMenuItem>
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