import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Profile } from "@/types/database";
import { useEffect } from "react";

const bankDetailsSchema = z.object({
  bank_account_holder_name: z.string().min(2, "Name is too short").max(100).nullable(),
  bank_account_number: z.string().min(5, "Account number is too short").max(20).nullable(),
  bank_ifsc_code: z.string().min(4, "IFSC code is too short").max(15).nullable(),
});

type BankDetailsFormValues = z.infer<typeof bankDetailsSchema>;

const updateBankDetails = async (values: BankDetailsFormValues) => {
  const { error } = await supabase.rpc('update_my_bank_details', {
    p_bank_account_holder_name: values.bank_account_holder_name,
    p_bank_account_number: values.bank_account_number,
    p_bank_ifsc_code: values.bank_ifsc_code,
  });

  if (error) throw new Error(error.message);
};

export const BankDetailsForm = ({ profile }: { profile: Profile }) => {
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof bankDetailsSchema>>({
    resolver: zodResolver(bankDetailsSchema),
    defaultValues: {},
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        bank_account_holder_name: profile.bank_account_holder_name || "",
        bank_account_number: profile.bank_account_number || "",
        bank_ifsc_code: profile.bank_ifsc_code || "",
      });
    }
  }, [profile, form]);

  const mutation = useMutation({
    mutationFn: updateBankDetails,
    onSuccess: () => {
      toast.success("Bank details updated successfully!");
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
    },
    onError: (error) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });

  const onSubmit = (values: z.infer<typeof bankDetailsSchema>) => {
    mutation.mutate(values);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bank Details</CardTitle>
        <CardDescription>
          Manage your bank account details for withdrawals. This information is kept secure.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="bank_account_holder_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Holder Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., John Doe" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="bank_account_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bank Account Number</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter account number" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bank_ifsc_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IFSC Code</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter IFSC code" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Save Bank Details"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default BankDetailsForm;