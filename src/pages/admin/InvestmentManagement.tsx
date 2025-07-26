import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { InvestmentPlan, AdminInvestmentView } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const fetchAllInvestmentPlans = async (): Promise<InvestmentPlan[]> => {
  const { data, error } = await supabase
    .from('investment_plans')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return data;
};

const fetchAllInvestments = async (): Promise<AdminInvestmentView[]> => {
  const { data, error } = await supabase.rpc('get_all_investments');
  if (error) throw new Error(error.message);
  return data;
};

const InvestmentManagement = () => {
  const { data: plans, isLoading: plansLoading, isError: plansIsError, error: plansError } = useQuery<InvestmentPlan[]>({
    queryKey: ['allInvestmentPlans'],
    queryFn: fetchAllInvestmentPlans,
  });

  const { data: allInvestments, isLoading: investmentsLoading, isError: investmentsIsError, error: investmentsError } = useQuery<AdminInvestmentView[]>({
    queryKey: ['allInvestments'],
    queryFn: fetchAllInvestments,
  });

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
              {plansLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : plansIsError ? (
                <div className="text-red-500">Error: {plansError.message}</div>
              ) : (
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
                    {plans?.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell className="font-medium">{plan.name}</TableCell>
                        <TableCell>{plan.annual_rate}%</TableCell>
                        <TableCell>{plan.duration_months} Months</TableCell>
                        <TableCell>₹{plan.min_investment.toLocaleString('en-IN')}</TableCell>
                        <TableCell><Badge variant={plan.is_active ? "default" : "secondary"}>{plan.is_active ? "Active" : "Disabled"}</Badge></TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem>Edit</DropdownMenuItem>
                              <DropdownMenuItem>{plan.is_active ? "Disable" : "Enable"}</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
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
              {investmentsLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : investmentsIsError ? (
                <div className="text-red-500">Error: {investmentsError.message}</div>
              ) : (
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
                    {allInvestments?.map((inv) => (
                      <TableRow key={inv.investment_id}>
                        <TableCell>{inv.user_name}</TableCell>
                        <TableCell>{inv.plan_name}</TableCell>
                        <TableCell>₹{inv.amount.toLocaleString('en-IN')}</TableCell>
                        <TableCell>{format(new Date(inv.start_date), "PPP")}</TableCell>
                        <TableCell><Badge>{inv.status}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
};
export default InvestmentManagement;