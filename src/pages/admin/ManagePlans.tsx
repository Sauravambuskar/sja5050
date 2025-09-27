import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { PlusCircle, Edit, Loader2 } from 'lucide-react';
import { InvestmentPlan } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { InvestmentPlanDialog } from '@/components/admin/InvestmentPlanDialog';

const fetchInvestmentPlans = async (): Promise<InvestmentPlan[]> => {
  const { data, error } = await supabase
    .from('investment_plans')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data;
};

export default function ManagePlans() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<InvestmentPlan | null>(null);

  const { data: plans, isLoading } = useQuery<InvestmentPlan[], Error>({
    queryKey: ['investmentPlansAdmin'],
    queryFn: fetchInvestmentPlans,
  });

  const handleEdit = (plan: InvestmentPlan) => {
    setSelectedPlan(plan);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setSelectedPlan(null);
    setIsDialogOpen(true);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Manage Investment Plans</h1>
        <Button onClick={handleAddNew}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Plan
        </Button>
      </div>

      <InvestmentPlanDialog
        plan={selectedPlan}
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedPlan(null);
        }}
      />

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Annual Rate</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : plans?.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell className="font-medium">{plan.name}</TableCell>
                <TableCell>{plan.annual_rate}%</TableCell>
                <TableCell>{plan.duration_months} months</TableCell>
                <TableCell>
                  <Badge variant={plan.is_active ? 'default' : 'outline'}>
                    {plan.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(plan)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}