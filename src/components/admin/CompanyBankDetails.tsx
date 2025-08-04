import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { SystemSettings } from '@/types/database';
import { useEffect } from 'react';

const bankDetailsSchema = z.object({
  bank_name: z.string().min(2, "Bank name is required."),
  account_holder_name: z.string().min(2, "Account holder name is required."),
  account_number: z.string().min(5, "Account number is required."),
  ifsc_code: z.string().min(4, "IFSC code is required."),
  upi_id: z.string().optional(),
});

type BankDetailsFormValues = z.infer<typeof bankDetailsSchema>;

const fetchSettings = async (): Promise<SystemSettings> => {
  const { data, error } = await supabase.from('system_settings').select('*').single();
  if (error) throw error;
  return data;
};

const updateBankDetails = async (values: BankDetailsFormValues) => {
  const { error } = await supabase
    .from('system_settings')
    .update({ company_bank_details: values })
    .eq('id', 1);
  if (error) throw error;
};

export const CompanyBankDetails = () => {
  const queryClient = useQueryClient();
  const form = useForm<BankDetailsFormValues>({ resolver: zodResolver(bankDetailsSchema) });

  const { data: settings, isLoading } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: fetchSettings,
  });

  useEffect(() => {
    if (settings?.company_bank_details) {
      form.reset(settings.company_bank_details);
    }
  }, [settings, form]);

  const mutation = useMutation({
    mutationFn: updateBankDetails,
    onSuccess: () => {
      toast.success("Company bank details updated successfully!");
      queryClient.invalidateQueries({ queryKey: ['systemSettings'] });
    },
    onError: (error) => { toast.error(`Update failed: ${error.message}`); },
  });

  const onSubmit = (values: BankDetailsFormValues) => mutation.mutate(values);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Company Bank Details</CardTitle>
        <CardDescription>This information will be displayed to users for manual deposits.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="bank_name" render={({ field }) => (<FormItem><FormLabel>Bank Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="account_holder_name" render={({ field }) => (<FormItem><FormLabel>Account Holder Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="account_number" render={({ field }) => (<FormItem><FormLabel>Account Number</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="ifsc_code" render={({ field }) => (<FormItem><FormLabel>IFSC Code</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="upi_id" render={({ field }) => (<FormItem><FormLabel>UPI ID (Optional)</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Bank Details
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
};