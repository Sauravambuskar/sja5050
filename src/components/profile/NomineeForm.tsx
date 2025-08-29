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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Profile } from "@/types/database";
import { useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const nomineeSchema = z.object({
  nominee_name: z.string().min(2, "Name must be at least 2 characters.").max(100).nullable(),
  nominee_relationship: z.string().min(2, "Relationship must be at least 2 characters.").max(50).nullable(),
  nominee_dob: z.date().nullable(),
  nominee_blood_group: z.string().nullable(),
});

type NomineeFormValues = z.infer<typeof nomineeSchema>;

const updateNomineeDetails = async (values: NomineeFormValues) => {
  const { error } = await supabase.rpc('update_my_nominee_details', {
    p_nominee_name: values.nominee_name,
    p_nominee_relationship: values.nominee_relationship,
    p_nominee_dob: values.nominee_dob ? format(values.nominee_dob, 'yyyy-MM-dd') : null,
    p_nominee_blood_group: values.nominee_blood_group,
  });

  if (error) throw new Error(error.message);
};

export const NomineeForm = ({ profile }: { profile: Profile }) => {
  const queryClient = useQueryClient();
  const form = useForm<NomineeFormValues>({
    resolver: zodResolver(nomineeSchema),
    defaultValues: {
      nominee_name: "",
      nominee_relationship: "",
      nominee_dob: null,
      nominee_blood_group: "",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        nominee_name: profile.nominee_name || "",
        nominee_relationship: profile.nominee_relationship || "",
        nominee_dob: profile.nominee_dob ? new Date(profile.nominee_dob) : null,
        nominee_blood_group: profile.nominee_blood_group || "",
      });
    }
  }, [profile, form]);

  const mutation = useMutation({
    mutationFn: updateNomineeDetails,
    onSuccess: () => {
      toast.success("Nominee details updated successfully!");
      queryClient.invalidateQueries({ queryKey: ['myProfile'] });
    },
    onError: (error) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });

  const onSubmit = (values: NomineeFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nominee Details</CardTitle>
        <CardDescription>
          Designate a nominee for your account. This information is kept confidential.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="nominee_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nominee Full Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Jane Doe" {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="nominee_relationship"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Relationship</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a relationship" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Spouse">Spouse</SelectItem>
                        <SelectItem value="Child">Child</SelectItem>
                        <SelectItem value="Parent">Parent</SelectItem>
                        <SelectItem value="Sibling">Sibling</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="nominee_dob"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Nominee Date of Birth</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                          >
                            {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                          initialFocus
                          captionLayout="dropdown-buttons"
                          fromYear={1900}
                          toYear={new Date().getFullYear()}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField control={form.control} name="nominee_blood_group" render={({ field }) => (<FormItem><FormLabel>Nominee's Blood Group</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value || undefined}><FormControl><SelectTrigger><SelectValue placeholder="Select blood group" /></SelectTrigger></FormControl><SelectContent><SelectItem value="A+">A+</SelectItem><SelectItem value="A-">A-</SelectItem><SelectItem value="B+">B+</SelectItem><SelectItem value="B-">B-</SelectItem><SelectItem value="AB+">AB+</SelectItem><SelectItem value="AB-">AB-</SelectItem><SelectItem value="O+">O+</SelectItem><SelectItem value="O-">O-</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
            </div>
            <Button type="submit" loading={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Save Nominee Details"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};