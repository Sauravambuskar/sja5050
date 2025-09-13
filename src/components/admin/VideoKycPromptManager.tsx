import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";

const promptSchema = z.object({
  prompt: z.string().min(10, "Prompt must be at least 10 characters.").max(1000, "Prompt cannot exceed 1000 characters."),
});

type PromptFormValues = z.infer<typeof promptSchema>;

const updatePrompt = async (values: PromptFormValues) => {
  const { error } = await supabase
    .from("system_settings")
    .update({ video_kyc_prompt: values.prompt })
    .eq("id", 1);

  if (error) {
    throw new Error(error.message);
  }
  return { success: true };
};

export const VideoKycPromptManager = () => {
  const queryClient = useQueryClient();
  const { settings, isLoading: isLoadingSettings } = useSystemSettings();

  const form = useForm<PromptFormValues>({
    resolver: zodResolver(promptSchema),
    defaultValues: {
      prompt: "",
    },
  });

  useEffect(() => {
    if (settings?.video_kyc_prompt) {
      form.reset({ prompt: settings.video_kyc_prompt });
    }
  }, [settings, form]);

  const mutation = useMutation({
    mutationFn: updatePrompt,
    onSuccess: () => {
      toast.success("Video KYC prompt updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["systemSettings"] });
    },
    onError: (error) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });

  const onSubmit = (values: PromptFormValues) => {
    mutation.mutate(values);
  };

  if (isLoadingSettings) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Video KYC Prompt</CardTitle>
        <CardDescription>
          Set the text that users will be prompted to read during their video KYC recording.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prompt Text</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={6}
                      placeholder="e.g., 'My name is [User's Name] and I am completing this video verification on [Date].'"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" loading={mutation.isPending}>
              Save Prompt
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};