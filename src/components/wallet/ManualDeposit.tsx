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
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { Skeleton } from "../ui/skeleton";
import { Copy } from "lucide-react";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

const depositSchema = z.object({
  amount: z.coerce.number().positive({ message: "Amount must be a positive number." }).min(100, "Minimum deposit is ₹100."),
  reference_id: z.string().min(5, "Transaction ID is required.").max(50),
  screenshot: z
    .any()
    .refine((files) => files?.length == 1, "Screenshot is required.")
    .refine((files) => files?.[0]?.size <= MAX_FILE_SIZE, `Max image size is 5MB.`)
    .refine(
      (files) => ACCEPTED_IMAGE_TYPES.includes(files?.[0]?.type),
      "Only .jpg, .jpeg, .png and .webp formats are supported."
    ),
});

const DetailRow = ({ label, value }: { label: string; value: string }) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied to clipboard!`);
  };

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}:</span>
      <div className="flex items-center gap-2">
        <span className="font-mono">{value}</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleCopy}>
          <Copy className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};

const ManualDeposit = () => {
  const queryClient = useQueryClient();
  const { settings, isLoading: settingsLoading } = useSystemSettings();
  const form = useForm<z.infer<typeof depositSchema>>({
    resolver: zodResolver(depositSchema),
    defaultValues: { amount: undefined, reference_id: "" },
  });

  const mutation = useMutation({
    mutationFn: async (values: z.infer<typeof depositSchema>) => {
      const { user } = (await supabase.auth.getUser()).data;
      if (!user) throw new Error("User not found");

      const file = values.screenshot[0] as File;
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('deposit_proofs')
        .upload(filePath, file);
      
      if (uploadError) {
        throw new Error(`Screenshot upload failed: ${uploadError.message}`);
      }

      const { error: rpcError } = await supabase.rpc('submit_deposit_request', {
        p_amount: values.amount,
        p_reference_id: values.reference_id,
        p_screenshot_path: filePath,
      });

      if (rpcError) throw new Error(rpcError.message);
    },
    onSuccess: () => {
      toast.success("Deposit request submitted!", { description: "It will be reviewed by our team shortly." });
      queryClient.invalidateQueries({ queryKey: ['depositHistory'] });
      form.reset();
    },
    onError: (error) => {
      toast.error(`Submission failed: ${error.message}`);
    },
  });

  const onSubmit = (values: z.infer<typeof depositSchema>) => {
    mutation.mutate(values);
  };

  return (
    <div className="grid gap-6 pt-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Step 1: Transfer Funds</CardTitle>
          <CardDescription>Please transfer the amount you wish to deposit to the bank account details below.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {settingsLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : settings?.company_bank_details ? (
            <>
              <DetailRow label="Bank Name" value={settings.company_bank_details.bank_name} />
              <DetailRow label="Account Holder" value={settings.company_bank_details.account_holder_name} />
              <DetailRow label="Account Number" value={settings.company_bank_details.account_number} />
              <DetailRow label="IFSC Code" value={settings.company_bank_details.ifsc_code} />
              <DetailRow label="UPI ID" value={settings.company_bank_details.upi_id} />
            </>
          ) : (
            <p className="text-sm text-destructive">Bank details are not configured. Please contact support.</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Step 2: Submit Your Request</CardTitle>
          <CardDescription>After transferring, fill out this form so we can verify your deposit.</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <FormField control={form.control} name="amount" render={({ field }) => (<FormItem><FormLabel>Amount (₹)</FormLabel><FormControl><Input type="number" placeholder="e.g., 10000" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="reference_id" render={({ field }) => (<FormItem><FormLabel>Transaction Reference / UTR ID</FormLabel><FormControl><Input placeholder="Enter the ID from your bank app" {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField
                control={form.control}
                name="screenshot"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Payment Screenshot</FormLabel>
                    <FormControl>
                      <Input
                        type="file"
                        accept="image/png, image/jpeg, image/webp"
                        onChange={(e) => field.onChange(e.target.files)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={mutation.isPending}>
                {mutation.isPending ? "Submitting..." : "Submit Deposit Request"}
              </Button>
            </CardContent>
          </form>
        </Form>
      </Card>
    </div>
  );
};

export default ManualDeposit;