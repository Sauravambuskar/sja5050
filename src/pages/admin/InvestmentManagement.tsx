import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

const plans = [
  { name: "Starter Growth", rate: "8% Annually", duration: "12 Months", min: "₹10,000", active: true },
  { name: "Steady Income", rate: "10% Annually", duration: "24 Months", min: "₹50,000", active: true },
  { name: "Wealth Builder", rate: "12% Annually", duration: "36 Months", min: "₹1,00,000", active: true },
  { name: "Retirement Plus", rate: "15% Annually", duration: "60 Months", min: "₹5,00,000", active: false },
];

const allInvestments = [
    { user: "John Doe", plan: "Wealth Builder", amount: "₹1,50,000", startDate: "2023-06-20", status: "Active" },
    { user: "Jane Smith", plan: "Starter Growth", amount: "₹25,000", startDate: "2024-07-15", status: "Active" },
    { user: "Alice Johnson", plan: "Steady Income", amount: "₹75,000", startDate: "2024-02-10", status: "Active" },
    { user: "Charlie Davis", plan: "Starter Growth", amount: "₹15,000", startDate: "2024-08-01", status: "Active" },
];

const InvestmentManagement = () => {
  return (
    <>
      <h1 className="text-3xl font-bold">Investment Management</h1>
      <p className="text-muted-foreground">Create plans, oversee investments, and manage triggers.</p>
      
      <Tabs defaultValue="manage-plans" className="mt-6">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="manage-plans">Manage Plans</TabsTrigger>
          <TabsTrigger value="all-investments">All Investments</TabsTrigger>
        </TabsList>
        <TabsContent value="manage-plans">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Investment Plans</CardTitle>
                  <CardDescription>Add, edit, or disable investment plans offered to users.</CardDescription>
                </div>
                <Button size="sm" className="gap-1">
                  <PlusCircle className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Create Plan</span>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Plan Name</TableHead>
                    <TableHead>Annual Rate</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Min. Investment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead><span className="sr-only">Actions</span></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan) => (
                    <TableRow key={plan.name}>
                      <TableCell className="font-medium">{plan.name}</TableCell>
                      <TableCell>{plan.rate}</TableCell>
                      <TableCell>{plan.duration}</TableCell>
                      <TableCell>{plan.min}</TableCell>
                      <TableCell><Badge variant={plan.active ? "default" : "secondary"}>{plan.active ? "Active" : "Disabled"}</Badge></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>Edit</DropdownMenuItem>
                            <DropdownMenuItem>{plan.active ? "Disable" : "Enable"}</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="all-investments">
          <Card>
            <CardHeader>
              <CardTitle>All Active Investments</CardTitle>
              <CardDescription>A complete log of all ongoing investments across the platform.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allInvestments.map((inv, i) => (
                    <TableRow key={i}>
                      <TableCell>{inv.user}</TableCell>
                      <TableCell>{inv.plan}</TableCell>
                      <TableCell>{inv.amount}</TableCell>
                      <TableCell>{inv.startDate}</TableCell>
                      <TableCell><Badge>{inv.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
};
export default InvestmentManagement;