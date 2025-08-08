import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const depositSchema = z.object({
  amount: z.coerce.number().positive({ message: "Amount must be a positive number." }).min(100, "Minimum deposit is ₹100."),
});

const createCheckoutSession = async ({ amount, origin }: { amount: number, origin: string }) => {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: { amount, origin },
  });
  if (error) throw new Error(error.message);
  if (data.error) throw new Error(data.error);
  return data;
};

const StripeDeposit = () => {
  const form = useForm<z.infer<typeof depositSchema>>({
    resolver: zodResolver(depositSchema),
    defaultValues: { amount: 1000 },
  });

  const mutation = useMutation({
    mutationFn: createCheckoutSession,
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error("Could not create payment session. Please try again.");
      }
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const onSubmit = (values: z.infer<typeof depositSchema>) => {
    mutation.mutate({ amount: values.amount, origin: window.location.origin });
  };

  return (
    <Card className="pt-4">
      <CardHeader>
        <CardTitle>Deposit Funds via Stripe</CardTitle>
        <CardDescription>Enter the amount you wish to deposit. You will be redirected to our secure payment partner, Stripe, to complete the transaction.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount (₹)</FormLabel>
                  <FormControl>
                    <Input type="number" placeholder="e.g., 10000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Proceed to Payment
            </Button>
          </CardContent>
        </form>
      </Form>
    </Card>
  );
};

export default StripeDeposit;