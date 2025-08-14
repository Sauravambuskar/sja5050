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

const kycSchema = z.object({
  pan_number: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid PAN number format.").nullable(),
  aadhaar_number: z.string().regex(/^[2-9]{1}[0-9]{3}[0-9]{4}[0-9]{4}$/, "Invalid Aadhaar number format (12 digits).").nullable(),
});

type KycFormValues = z.infer<typeof kycSchema>;

const updateKycDetails = async (values: KycFormValues) => {
  const { error } = await supabase.rpc('update_my_kyc_details', {
    p_pan_number: values.pan_number,
    p_aadhaar_number: values.aadhaar_number,
  });
  if (error) throw new Error(error.message);
};

export const KycForm = ({ profile }: { profile: Profile }) => {
  const queryClient = useQueryClient();
  const form = useForm<KycFormValues>({
    resolver: zodResolver(kycSchema),
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        pan_number: profile.pan_number || "",
        aadhaar_number: profile.aadhaar_number || "",
      });
    }
  }, [profile, form]);

  const mutation = useMutation({
    mutationFn: updateKycDetails,
    onSuccess: () => {
      toast.success("KYC details saved successfully!");
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
    },
    onError: (error) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });

  const onSubmit = (values: KycFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>KYC Information</CardTitle>
        <CardDescription>
          Please provide your official identification numbers. This information is stored securely.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="pan_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>PAN Card Number</FormLabel>
                  <FormControl>
                    <Input placeholder="ABCDE1234F" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="aadhaar_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Aadhaar Card Number</FormLabel>
                  <FormControl>
                    <Input placeholder="123456789012" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Save KYC Details"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};