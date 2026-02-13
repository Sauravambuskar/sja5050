import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, FileText } from "lucide-react";
import { SystemSettings } from "@/types/database";

const agreementSchema = z.object({
  investment_agreement_text: z
    .string()
    .min(50, "Agreement content is too short.")
    .max(20000, "Agreement content is too long.")
    .transform((s) => s.trim()),
});

type AgreementFormValues = z.infer<typeof agreementSchema>;

const fetchSettings = async (): Promise<SystemSettings> => {
  const { data, error } = await supabase.from("system_settings").select("*").single();
  if (error) throw error;
  return data;
};

const updateAgreement = async (values: AgreementFormValues) => {
  const { error } = await supabase.rpc("admin_update_investment_agreement_template", {
    p_text: values.investment_agreement_text,
  });
  if (error) throw error;
};

export const AgreementCustomizer = () => {
  const queryClient = useQueryClient();
  const form = useForm<AgreementFormValues>({ resolver: zodResolver(agreementSchema) });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["systemSettings"],
    queryFn: fetchSettings,
  });

  useEffect(() => {
    if (!settings) return;
    form.reset({
      investment_agreement_text: settings.investment_agreement_text ?? "",
    });
  }, [settings, form]);

  const mutation = useMutation({
    mutationFn: updateAgreement,
    onSuccess: () => {
      toast.success("Agreement template updated.");
      queryClient.invalidateQueries({ queryKey: ["systemSettings"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Investment Agreement Template
        </CardTitle>
        <CardDescription>
          This content is shown to users when they sign the investment agreement, and the exact text is stored with their signature.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} className="space-y-4">
              <FormField
                control={form.control}
                name="investment_agreement_text"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agreement content</FormLabel>
                    <FormControl>
                      <Textarea
                        className="min-h-[260px] font-mono text-sm"
                        placeholder="Enter agreement text..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Tip: You can use Markdown-like formatting (**bold**, numbered lists). It will be displayed as plain text with formatting symbols.
                    </p>
                  </FormItem>
                )}
              />

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Agreement
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
};