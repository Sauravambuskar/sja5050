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
import { Switch } from "@/components/ui/switch";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { CommissionRule } from "@/types/database";
import { useEffect } from "react";

const ruleSchema = z.object({
  level: z.coerce.number().int().min(1, "Level must be at least 1."),
  rate: z.coerce.number().min(0, "Rate cannot be negative."),
  is_active: z.boolean(),
});

type RuleFormValues = z.infer<typeof ruleSchema>;

interface CommissionRuleDialogProps {
  rule: CommissionRule | null;
  isOpen: boolean;
  onClose: () => void;
}

const upsertRule = async (values: RuleFormValues) => {
  const { error } = await supabase.rpc('upsert_commission_rule', {
    rule_level: values.level,
    rule_rate: values.rate,
    rule_is_active: values.is_active,
  });
  if (error) throw new Error(error.message);
};

export const CommissionRuleDialog = ({ rule, isOpen, onClose }: CommissionRuleDialogProps) => {
  const queryClient = useQueryClient();
  const form = useForm<RuleFormValues>({
    resolver: zodResolver(ruleSchema),
    defaultValues: {
      level: 1,
      rate: 0,
      is_active: true,
    },
  });

  useEffect(() => {
    if (rule) {
      form.reset(rule);
    } else {
      form.reset({ level: 1, rate: 0, is_active: true });
    }
  }, [rule, form, isOpen]);

  const mutation = useMutation({
    mutationFn: upsertRule,
    onSuccess: () => {
      toast.success("Commission rule saved successfully!");
      queryClient.invalidateQueries({ queryKey: ['commissionRules'] });
      onClose();
    },
    onError: (error) => {
      toast.error(`Save failed: ${error.message}`);
    },
  });

  const onSubmit = (values: RuleFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{rule ? 'Edit' : 'Add'} Commission Rule</DialogTitle>
          <DialogDescription>
            Define the commission rate for a specific referral level.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
              control={form.control}
              name="level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referral Level</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} disabled={!!rule} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Commission Rate (%)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.1" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Active Status</FormLabel>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : "Save Rule"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};