import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { InvestmentPlan, AdminInvestmentView } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useState } from "react";
import { InvestmentPlanDialog } from "@/components/admin/InvestmentPlanDialog";
import { toast } from "sonner";

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

const upsertPlan = async (plan: InvestmentPlan) => {
  const { error } = await supabase.rpc('upsert_investment_plan', {
    p_id: plan.id,
    p_name: plan.name,
    p_description: plan.description,
    p_annual_rate: plan.annual_rate,
    p_duration_months: plan.duration_months,
    p_min_investment: plan.min_investment,
    p_max_investment: plan.max_investment,
    p_is_active: plan.is_active,
  });
  if (error) throw new Error(error.message);
};

const InvestmentManagement = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<InvestmentPlan | null>(null);
  const queryClient = useQueryClient();

  const { data: plans, isLoading: plansLoading, isError: plansIsError, error: plansError } = useQuery<InvestmentPlan[]>({
    queryKey: ['allInvestmentPlans'],
    queryFn: fetchAllInvestmentPlans,
  });

  const { data: allInvestments, isLoading: investmentsLoading, isError: investmentsIsError, error: investmentsError } = useQuery<AdminInvestmentView[]>({
    queryKey: ['allInvestments'],
    queryFn: fetchAllInvestments,
  });

  const mutation = useMutation({
    mutationFn: upsertPlan,
    onSuccess: () => {
      toast.success("Plan status updated!");
      queryClient.invalidateQueries({ queryKey: ['allInvestmentPlans'] });
    },
    onError: (error) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });

  const handleCreatePlan = () => {
    setSelectedPlan(null);
    setIsDialogOpen(true);
  };

  const handleEditPlan = (plan: InvestmentPlan) => {
    setSelectedPlan(plan);
    setIsDialogOpen(true);
  };

  const handleToggleStatus = (plan: InvestmentPlan) => {
    mutation.mutate({ ...plan, is_active: !plan.is_active });
  };

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
                <Button size="sm" className="gap-1" onClick={handleCreatePlan}>
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
                      <TableHead>Max. Investment</TableHead>
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
                        <TableCell>₹{plan.max_investment?.toLocaleString('en-IN') ?? 'No Limit'}</TableCell>
                        <TableCell><Badge variant={plan.is_active ? "default" : "secondary"}>{plan.is_active ? "Active" : "Disabled"}</Badge></TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => handleEditPlan(plan)}>Edit</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleStatus(plan)}>{plan.is_active ? "Disable" : "Enable"}</DropdownMenuItem>
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
      <InvestmentPlanDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        plan={selectedPlan}
      />
    </>
  );
};
export default InvestmentManagement;