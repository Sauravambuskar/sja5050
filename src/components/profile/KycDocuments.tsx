import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileUp, AlertCircle } from "lucide-react";

const documents = [
  { name: "Aadhaar Card", status: "Approved", date: "2023-05-10" },
  { name: "PAN Card", status: "Approved", date: "2023-05-10" },
  { name: "Bank Statement", status: "Pending", date: "2024-08-05" },
];

const KycDocuments = () => {
  return (
    <div className="grid gap-6 pt-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Upload KYC Documents</CardTitle>
          <CardDescription>
            Upload your documents for verification. Ensure files are clear and legible.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="aadhaar">Aadhaar Card (Front & Back)</Label>
            <Input id="aadhaar" type="file" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pan">PAN Card</Label>
            <Input id="pan" type="file" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bank-statement">Bank Statement (Last 6 months)</Label>
            <Input id="bank-statement" type="file" />
          </div>
          <Button className="w-full">
            <FileUp className="mr-2 h-4 w-4" /> Upload Files
          </Button>
          <div className="mt-4 flex items-start rounded-md border border-yellow-200 bg-yellow-50 p-4 text-yellow-900 dark:border-yellow-900/50 dark:bg-yellow-900/20 dark:text-yellow-200">
            <AlertCircle className="mr-3 h-5 w-5 flex-shrink-0" />
            <p className="text-sm">
              Your KYC status is currently <span className="font-semibold">Pending Review</span>. Verification may take up to 48 hours.
            </p>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Submitted Documents</CardTitle>
          <CardDescription>History of your submitted documents.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document Name</TableHead>
                <TableHead>Submission Date</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.name}>
                  <TableCell className="font-medium">{doc.name}</TableCell>
                  <TableCell>{doc.date}</TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant={
                        doc.status === "Approved"
                          ? "default"
                          : doc.status === "Pending"
                          ? "outline"
                          : "destructive"
                      }
                    >
                      {doc.status}
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

export default KycDocuments;