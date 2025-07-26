import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal } from "lucide-react";

const kycSubmissions = [
  { user: "Alice Johnson", email: "alice.j@example.com", date: "2024-08-05", documents: ["Aadhaar", "PAN", "Bank Statement"] },
  { user: "David Williams", email: "david.w@example.com", date: "2024-08-04", documents: ["Aadhaar", "PAN"] },
  { user: "Eve Miller", email: "eve.m@example.com", date: "2024-08-02", documents: ["Aadhaar", "PAN", "Bank Statement"] },
];

const KycManagement = () => {
  return (
    <>
      <h1 className="text-3xl font-bold">KYC Toolkit</h1>
      <p className="text-muted-foreground">Review and process client KYC submissions.</p>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Pending KYC Submissions</CardTitle>
          <CardDescription>Review the documents submitted by users and take action.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Submission Date</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kycSubmissions.map((sub) => (
                <TableRow key={sub.email}>
                  <TableCell>
                    <div className="font-medium">{sub.user}</div>
                    <div className="text-sm text-muted-foreground">{sub.email}</div>
                  </TableCell>
                  <TableCell>{sub.date}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {sub.documents.map(doc => <Badge key={doc} variant="secondary">{doc}</Badge>)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem>View Documents</DropdownMenuItem>
                        <DropdownMenuItem>Approve KYC</DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600">Reject KYC</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
};
export default KycManagement;