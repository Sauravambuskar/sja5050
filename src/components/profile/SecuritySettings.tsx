import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import TwoFactorAuth from "./TwoFactorAuth";

const passwordSchema = z.object({
  newPassword: z.string().min(8, "Password must be at least 8 characters."),
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match.",
  path: ["confirmPassword"],
});

const updateUserPassword = async (password: string) => {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new Error(error.message);
};

export const SecuritySettings = () => {
  const form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const mutation = useMutation({
    mutationFn: updateUserPassword,
    onSuccess: () => {
      toast.success("Password updated successfully!");
      form.reset();
    },
    onError: (error) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });

  const onSubmit = (values: z.infer<typeof passwordSchema>) => {
    mutation.mutate(values.newPassword);
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>
            Enter a new password for your account. It's a good practice to use a strong, unique password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-md">
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Updating..." : "Update Password"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      <TwoFactorAuth />
    </div>
  );
};

export default SecuritySettings;