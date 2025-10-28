import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AdminUserInvestmentHistoryItem } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ReduceInvestmentDialog } from "@/components/admin/dialogs/ReduceInvestmentDialog";
import { Badge } from "@/components/ui/badge";
import { showSuccess, showError } from "@/utils/toast";

const fetchUserInvestmentHistory = async (userId: string): Promise<AdminUserInvestmentHistoryItem[]> => {
  const { data, error } = await supabase.rpc('get_user_investment_history_for_admin', { user_id_to_fetch: userId });
  if (error) throw new Error(error.message);
  return data;
};

export const AdminUserInvestmentsTab = ({ userId }: { userId: string }) => {
  const [selectedInvestment, setSelectedInvestment] = useState<AdminUserInvestmentHistoryItem | null>(null);
  const [isReduceDialogOpen, setIsReduceDialogOpen] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: investments, isLoading: areInvestmentsLoading } = useQuery({
    queryKey: ['userInvestmentHistory', userId],
    queryFn: () => fetchUserInvestmentHistory(userId),
    enabled: !!userId,
  });

  const handleReduceClick = (investment: AdminUserInvestmentHistoryItem) => {
    setSelectedInvestment(investment);
    setIsReduceDialogOpen(true);
  };

  const handleDeactivate = async (investment: AdminUserInvestmentHistoryItem) => {
    try {
      setActionLoadingId(investment.id);
      const { error } = await supabase.rpc('admin_reduce_investment_amount', {
        p_investment_id: investment.id,
        p_reduction_amount: investment.investment_amount,
        p_notes: 'Admin deactivated investment'
      });
      if (error) throw new Error(error.message);
      showSuccess('Investment deactivated and recorded as withdrawal.');
      // Refresh list
      queryClient.invalidateQueries({ queryKey: ['userInvestmentHistory', userId] });
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to deactivate investment');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleActivate = async (investment: AdminUserInvestmentHistoryItem) => {
    try {
      setActionLoadingId(investment.id);
      // Prevent activating matured or zero principal investments
      if (investment.status === 'Matured') {
        throw new Error('Cannot activate a matured investment.');
      }
      if (investment.investment_amount <= 0) {
        throw new Error('Cannot activate an investment with zero principal.');
      }

      const { error } = await supabase
        .from('user_investments')
        .update({ status: 'Active' })
        .eq('id', investment.id);
      if (error) throw new Error(error.message);

      showSuccess('Investment activated successfully.');
      queryClient.invalidateQueries({ queryKey: ['userInvestmentHistory', userId] });
    } catch (e) {
      showError(e instanceof Error ? e.message : 'Failed to activate investment');
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <>
      <Card>
        <CardHeader><CardTitle>Investment History</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plan</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {areInvestmentsLoading ? (
                [...Array(2)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-4 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-20" /></TableCell>
                  </TableRow>
                ))
              ) : investments && investments.length > 0 ? (
                investments.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>{inv.plan_name}</TableCell>
                    <TableCell>{format(new Date(inv.start_date), "PPP")}</TableCell>
                    <TableCell>
                      <Badge variant={inv.status === "Active" ? "success" : "secondary"}>{inv.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">₹{inv.investment_amount.toLocaleString('en-IN')}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {inv.status === 'Active' && (
                          <>
                            <Button
                              size="sm"
                              variant="destructive"
                              loading={actionLoadingId === inv.id}
                              onClick={() => handleDeactivate(inv)}
                            >
                              Deactivate
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReduceClick(inv)}
                              disabled={actionLoadingId === inv.id}
                            >
                              Reduce
                            </Button>
                          </>
                        )}
                        {inv.status === 'Withdrawn' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={actionLoadingId === inv.id}
                            onClick={() => handleActivate(inv)}
                          >
                            Activate
                          </Button>
                        )}
                        {/* For 'Matured', no actions */}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={5} className="h-24 text-center">No investments found.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <ReduceInvestmentDialog
        investment={selectedInvestment}
        userId={userId}
        isOpen={isReduceDialogOpen}
        onOpenChange={setIsReduceDialogOpen}
      />
    </>
  );
};