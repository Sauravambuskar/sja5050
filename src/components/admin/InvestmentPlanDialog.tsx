import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { InvestmentPlan } from "@/types/database";
import { useEffect } from "react";

const planSchema = z.object({
  name: z.string().min(3, "Plan name is required."),
  description: z.string().optional(),
  annual_rate: z.coerce.number().min(0, "Rate cannot be negative."),
  duration_months: z.coerce.number().int().min(1, "Duration must be at least 1 month."),
  min_investment: z.coerce.number().min(0, "Minimum investment cannot be negative."),
  is_active: z.boolean(),
});

type PlanFormValues = z.infer<typeof planSchema>;

interface InvestmentPlanDialogProps {
  plan: InvestmentPlan | null;
  isOpen: boolean;
  onClose: () => void;
}

const upsertPlan = async (values: PlanFormValues & { id: string }) => {
  const { error } = await supabase.rpc('upsert_investment_plan', {
    p_id: values.id,
    p_name: values.name,
    p_description: values.description,
    p_annual_rate: values.annual_rate,
    p_duration_months: values.duration_months,
    p_min_investment: values.min_investment,
    p_is_active: values.is_active,
  });
  if (error) throw new Error(error.message);
};

export const InvestmentPlanDialog = ({ plan, isOpen, onClose }: InvestmentPlanDialogProps) => {
  const queryClient = useQueryClient();
  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
  });

  useEffect(() => {
    if (plan) {
      form.reset(plan);
    } else {
      form.reset({
        name: "",
        description: "",
        annual_rate: 0,
        duration_months: 12,
        min_investment: 1000,
        is_active: true,
      });
    }
  }, [plan, form, isOpen]);

  const mutation = useMutation({
    mutationFn: upsertPlan,
    onSuccess: () => {
      toast.success("Investment plan saved successfully!");
      queryClient.invalidateQueries({ queryKey: ['allInvestmentPlans'] });
      onClose();
    },
    onError: (error) => {
      toast.error(`Save failed: ${error.message}`);
    },
  });

  const onSubmit = (values: PlanFormValues) => {
    const id = plan?.id || crypto.randomUUID();
    mutation.mutate({ ...values, id });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{plan ? 'Edit' : 'Create'} Investment Plan</DialogTitle>
          <DialogDescription>
            Define the details for this investment plan. Click save when you're done.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem><FormLabel>Plan Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>Description</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <FormField control={form.control} name="annual_rate" render={({ field }) => (
                <FormItem><FormLabel>Annual Rate (%)</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="duration_months" render={({ field }) => (
                <FormItem><FormLabel>Duration (Months)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="min_investment" render={({ field }) => (
                <FormItem><FormLabel>Min. Investment (₹)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <FormField control={form.control} name="is_active" render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm"><div className="space-y-0.5"><FormLabel>Active Status</FormLabel></div><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl></FormItem>
            )} />
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : "Save Plan"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};