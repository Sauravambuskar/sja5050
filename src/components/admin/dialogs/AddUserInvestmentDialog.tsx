import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useForm } from "react-hook-form";

import { supabase } from "@/lib/supabase";
import { InvestmentPlan } from "@/types/database";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const schema = z.object({
  planId: z.string().uuid({ message: "Please select a plan." }),
  amount: z.coerce.number().positive({ message: "Amount must be positive." }),
  startDate: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

async function fetchPlans(): Promise<InvestmentPlan[]> {
  const { data, error } = await supabase
    .from("investment_plans")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data;
}

export function AddUserInvestmentDialog({
  userId,
  open,
  onOpenChange,
}: {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      amount: 0,
    },
  });

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ["allInvestmentPlans"],
    queryFn: fetchPlans,
    enabled: open,
  });

  const selectedPlan = useMemo(() => {
    const planId = form.watch("planId");
    return plans?.find((p) => p.id === planId) ?? null;
  }, [plans, form]);

  const enablePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase
        .from("investment_plans")
        .update({ is_active: true })
        .eq("id", planId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      toast.success("Plan enabled.");
      queryClient.invalidateQueries({ queryKey: ["allInvestmentPlans"] });
    },
    onError: (e) => toast.error(e.message),
  });

  const addInvestmentMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const args: Record<string, unknown> = {
        p_user_id: userId,
        p_plan_id: values.planId,
        p_amount: values.amount,
      };
      if (values.startDate) args.p_start_date = values.startDate;

      const { data, error } = await supabase.rpc("admin_create_user_investment", args);
      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      toast.success("Investment added successfully.");
      queryClient.invalidateQueries({ queryKey: ["userInvestmentHistory", userId] });
      queryClient.invalidateQueries({ queryKey: ["allInvestments"] });
      onOpenChange(false);
      form.reset({ amount: 0 });
    },
    onError: (e) => toast.error(e.message),
  });

  const onSubmit = (values: FormValues) => {
    if (selectedPlan && !selectedPlan.is_active) {
      toast.error("Selected plan is disabled. Enable it first.");
      return;
    }
    addInvestmentMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Investment</DialogTitle>
          <DialogDescription>
            Add an investment directly for this user. The investment will be created as <span className="font-medium">Active</span>.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="planId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Plan</FormLabel>
                  <FormControl>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder={plansLoading ? "Loading plans..." : "Select a plan"} />
                      </SelectTrigger>
                      <SelectContent>
                        {(plans ?? []).map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name} {plan.is_active ? "" : "(Disabled)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {selectedPlan && (
              <div className="flex flex-wrap items-center gap-2 rounded-md border p-3 text-sm">
                <Badge variant={selectedPlan.is_active ? "default" : "secondary"}>
                  {selectedPlan.is_active ? "Active" : "Disabled"}
                </Badge>
                <div className="text-muted-foreground">
                  Min: ₹{selectedPlan.min_investment.toLocaleString("en-IN")} • Max:{" "}
                  {selectedPlan.max_investment ? `₹${selectedPlan.max_investment.toLocaleString("en-IN")}` : "No limit"}
                </div>
                {!selectedPlan.is_active && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="ml-auto"
                    onClick={() => enablePlanMutation.mutate(selectedPlan.id)}
                    disabled={enablePlanMutation.isPending}
                  >
                    {enablePlanMutation.isPending ? "Enabling..." : "Enable plan"}
                  </Button>
                )}
              </div>
            )}

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" inputMode="decimal" placeholder="e.g. 50000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Start date (optional)</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value ?? ""} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={addInvestmentMutation.isPending}>
                {addInvestmentMutation.isPending ? "Adding..." : "Add Investment"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
