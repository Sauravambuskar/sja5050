import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Banknote } from "lucide-react";

const depositSchema = z.object({
  amount: z.coerce.number().positive({ message: "Amount must be a positive number." }).min(100, "Minimum deposit is ₹100."),
});

const depositFunds = async (amount: number) => {
  const { error } = await supabase.rpc('deposit_funds', { deposit_amount: amount });
  if (error) throw new Error(error.message);
};

const DepositForm = () => {
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof depositSchema>>({
    resolver: zodResolver(depositSchema),
    defaultValues: {
      amount: undefined,
    }
  });

  const mutation = useMutation({
    mutationFn: depositFunds,
    onSuccess: () => {
      toast.success("Deposit successful!");
      queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      form.reset();
    },
    onError: (error) => {
      toast.error(`Deposit failed: ${error.message}`);
    },
  });

  const onSubmit = (values: z.infer<typeof depositSchema>) => {
    mutation.mutate(values.amount);
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Deposit Funds</CardTitle>
        <CardDescription>Add funds to your wallet to start investing. This is a simulated deposit.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="grid gap-6">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount (₹)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Banknote className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input type="number" placeholder="e.g., 10000" className="pl-10" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? "Processing..." : "Confirm Deposit"}
            </Button>
          </CardContent>
        </form>
      </Form>
    </Card>
  );
};

export default DepositForm;