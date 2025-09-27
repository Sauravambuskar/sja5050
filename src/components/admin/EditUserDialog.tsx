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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { AdminUserView } from "@/types/database";
import { useEffect } from "react";

const editUserSchema = z.object({
  fullName: z.string().min(2, "Full name is required."),
  role: z.enum(["user", "admin"], { required_error: "Role is required." }),
});

type EditUserFormValues = z.infer<typeof editUserSchema>;

interface EditUserDialogProps {
  user: AdminUserView | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const updateUser = async (values: EditUserFormValues & { userId: string }) => {
  const { data, error } = await supabase.functions.invoke('admin-update-user', {
    body: values,
  });

  if (error) throw new Error(error.message);
  if (data.error) throw new Error(data.error);

  return data;
};

export const EditUserDialog = ({ user, isOpen, onOpenChange }: EditUserDialogProps) => {
  const queryClient = useQueryClient();
  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
  });

  useEffect(() => {
    if (user) {
      form.reset({
        fullName: user.full_name || "",
        role: user.role,
      });
    }
  }, [user, form, isOpen]);

  const mutation = useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      toast.success("User updated successfully!");
      queryClient.invalidateQueries({ queryKey: ['allUsersDetails'] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Failed to update user: ${error.message}`);
    },
  });

  const onSubmit = (values: EditUserFormValues) => {
    if (!user) return;
    mutation.mutate({ ...values, userId: user.id });
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit User</DialogTitle>
          <DialogDescription>
            Update user details. Changes will be applied immediately.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormItem>
              <FormLabel>Email Address</FormLabel>
              <Input value={user.email} disabled />
            </FormItem>
            <FormField control={form.control} name="fullName" render={({ field }) => (
              <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="role" render={({ field }) => (
              <FormItem><FormLabel>Role</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              <FormMessage /></FormItem>
            )} />
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};