import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { CommissionRule } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { CommissionRuleDialog } from "@/components/admin/CommissionRuleDialog";
import { toast } from "sonner";

const fetchCommissionRules = async (): Promise<CommissionRule[]> => {
  const { data, error } = await supabase.rpc('get_commission_rules');
  if (error) throw new Error(error.message);
  return data;
};

const upsertRule = async (values: CommissionRule) => {
  const { error } = await supabase.rpc('upsert_commission_rule', {
    rule_level: values.level,
    rule_rate: values.rate,
    rule_is_active: values.is_active,
  });
  if (error) throw new Error(error.message);
};

const CommissionRules = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRule, setSelectedRule] = useState<CommissionRule | null>(null);
  const queryClient = useQueryClient();

  const { data: rules, isLoading, isError, error } = useQuery<CommissionRule[]>({
    queryKey: ['commissionRules'],
    queryFn: fetchCommissionRules,
  });

  const mutation = useMutation({
    mutationFn: upsertRule,
    onSuccess: (_, variables) => {
      toast.success(`Rule for Level ${variables.level} has been ${variables.is_active ? 'activated' : 'deactivated'}.`);
      queryClient.invalidateQueries({ queryKey: ['commissionRules'] });
    },
    onError: (error) => {
      toast.error(`Action failed: ${error.message}`);
    },
  });

  const handleAddRule = () => {
    setSelectedRule(null);
    setIsDialogOpen(true);
  };

  const handleEditRule = (rule: CommissionRule) => {
    setSelectedRule(rule);
    setIsDialogOpen(true);
  };

  const handleToggleStatus = (rule: CommissionRule) => {
    mutation.mutate({ ...rule, is_active: !rule.is_active });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Commission Rules Engine</CardTitle>
              <CardDescription>Configure referral levels and their commission rates.</CardDescription>
            </div>
            <Button size="sm" className="gap-1" onClick={handleAddRule}>
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
              {isLoading ? (
                [...Array(4)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow><TableCell colSpan={4} className="text-center text-red-500">Error: {error.message}</TableCell></TableRow>
              ) : (
                rules?.map((rule) => (
                  <TableRow key={rule.level}>
                    <TableCell className="font-medium">Level {rule.level}</TableCell>
                    <TableCell>{rule.rate}%</TableCell>
                    <TableCell>
                      <Badge variant={rule.is_active ? "default" : "secondary"}>
                        {rule.is_active ? "Active" : "Inactive"}
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
                          <DropdownMenuItem onClick={() => handleEditRule(rule)}>Edit Rule</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleStatus(rule)}>
                            {rule.is_active ? "Deactivate" : "Activate"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <CommissionRuleDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        rule={selectedRule}
      />
    </>
  );
};
export default CommissionRules;