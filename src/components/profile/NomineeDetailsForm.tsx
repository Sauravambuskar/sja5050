import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";

const nomineeSchema = z.object({
  nominee_name: z.string().min(2, "Full name is required."),
  nominee_relationship: z.string().min(1, "Relationship is required."),
  nominee_dob: z.string().optional(),
});

type NomineeFormValues = z.infer<typeof nomineeSchema>;

const fetchNomineeDetails = async (userId: string) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("nominee_name, nominee_relationship, nominee_dob")
    .eq("id", userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message);
  }
  return data;
};

const updateNomineeDetails = async ({ userId, nomineeData }: { userId: string; nomineeData: NomineeFormValues }) => {
  const { error } = await supabase
    .from("profiles")
    .update(nomineeData)
    .eq("id", userId);

  if (error) {
    throw new Error(error.message);
  }
};

const NomineeDetailsForm = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: nominee, isLoading } = useQuery({
    queryKey: ["nomineeDetails", user?.id],
    queryFn: () => fetchNomineeDetails(user!.id),
    enabled: !!user,
  });

  const mutation = useMutation({
    mutationFn: updateNomineeDetails,
    onSuccess: () => {
      toast.success("Nominee details updated successfully!");
      queryClient.invalidateQueries({ queryKey: ["nomineeDetails", user?.id] });
    },
    onError: (error) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });

  const form = useForm<NomineeFormValues>({
    resolver: zodResolver(nomineeSchema),
  });

  useEffect(() => {
    if (nominee) {
      form.reset({
        nominee_name: nominee.nominee_name || "",
        nominee_relationship: nominee.nominee_relationship || "",
        nominee_dob: nominee.nominee_dob || "",
      });
    }
  }, [nominee, form]);

  const onSubmit = (values: NomineeFormValues) => {
    mutation.mutate({ userId: user!.id, nomineeData: values });
  };

  if (isLoading) {
    return (
      <Card className="mt-4">
        <CardHeader>
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-2/3 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Nominee Information</CardTitle>
        <CardDescription>Designate a nominee for your investments. Click save when you're done.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField control={form.control} name="nominee_name" render={({ field }) => (
                <FormItem><FormLabel>Nominee Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="nominee_relationship" render={({ field }) => (
                <FormItem><FormLabel>Relationship</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select relationship" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="spouse">Spouse</SelectItem>
                      <SelectItem value="child">Child</SelectItem>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="sibling">Sibling</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                <FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="nominee_dob" render={({ field }) => (
                <FormItem><FormLabel>Nominee Date of Birth</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Save Nominee"}
            </Button>
          </CardContent>
        </form>
      </Form>
    </Card>
  );
};

export default NomineeDetailsForm;