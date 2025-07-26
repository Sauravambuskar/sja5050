import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, PlusCircle } from "lucide-react";

const commissionRules = [
  { level: 1, rate: "5%", status: "Active" },
  { level: 2, rate: "3%", status: "Active" },
  { level: 3, rate: "2%", status: "Active" },
  { level: 4, rate: "1%", status: "Inactive" },
  { level: 5, rate: "0.5%", status: "Inactive" },
];

const CommissionRules = () => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Commission Rules Engine</CardTitle>
            <CardDescription>Configure referral levels and their commission rates.</CardDescription>
          </div>
          <Button size="sm" className="gap-1">
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
              Add Rule
            </span>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Referral Level</TableHead>
              <TableHead>Commission Rate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>
                <span className="sr-only">Actions</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {commissionRules.map((rule) => (
              <TableRow key={rule.level}>
                <TableCell className="font-medium">Level {rule.level}</TableCell>
                <TableCell>{rule.rate}</TableCell>
                <TableCell>
                  <Badge variant={rule.status === "Active" ? "default" : "secondary"}>
                    {rule.status}
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
                      <DropdownMenuItem>Edit Rule</DropdownMenuItem>
                      <DropdownMenuItem>
                        {rule.status === "Active" ? "Deactivate" : "Activate"}
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
export default CommissionRules;