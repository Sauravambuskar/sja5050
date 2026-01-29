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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Copy, KeyRound, Loader2, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

function generatePassword(length = 12) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => alphabet[b % alphabet.length])
    .join("");
}

const addUserSchema = z
  .object({
    create_mode: z.enum(["instant", "invite"]).default("instant"),
    email: z.string().email("Invalid email address."),
    password: z.string().optional().nullable(),

    full_name: z.string().min(2, "Name is required.").max(100),
    phone: z.string().optional().nullable(),
    dob: z.date().optional().nullable(),
    address: z.string().optional().nullable(),
    city: z.string().optional().nullable(),
    state: z.string().optional().nullable(),
    pincode: z.string().optional().nullable(),
    bank_name: z.string().optional().nullable(),
    bank_account_holder_name: z.string().optional().nullable(),
    bank_account_number: z.string().optional().nullable(),
    bank_ifsc_code: z.string().optional().nullable(),
    nominee_name: z.string().optional().nullable(),
    nominee_relationship: z.string().optional().nullable(),
    nominee_dob: z.date().optional().nullable(),
  })
  .superRefine((val, ctx) => {
    if (val.create_mode === "instant") {
      const pwd = val.password?.trim() ?? "";
      if (pwd.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Password is required (min 8 characters) for instant creation.",
          path: ["password"],
        });
      }
    }
  });

type AddUserFormValues = z.infer<typeof addUserSchema>;

interface AddUserDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const createUser = async (values: AddUserFormValues) => {
  const { email, create_mode, password, ...profileData } = values;
  const formattedProfileData = {
    ...profileData,
    dob: values.dob ? format(values.dob, "yyyy-MM-dd") : null,
    nominee_dob: values.nominee_dob ? format(values.nominee_dob, "yyyy-MM-dd") : null,
  };

  const { data, error } = await supabase.functions.invoke("admin-create-user", {
    body: {
      email,
      mode: create_mode,
      password: create_mode === "instant" ? password : undefined,
      profileData: formattedProfileData,
    },
  });
  if (error) throw error;
  if (data.error) throw new Error(data.error);
  return data as { message: string; userId: string };
};

export const AddUserDialog = ({ isOpen, onOpenChange }: AddUserDialogProps) => {
  const queryClient = useQueryClient();
  const form = useForm<AddUserFormValues>({
    resolver: zodResolver(addUserSchema),
    defaultValues: {
      create_mode: "instant",
      password: generatePassword(),
    },
  });

  const mode = form.watch("create_mode");
  const currentPassword = form.watch("password") || "";

  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: async (_data, variables) => {
      if (variables.create_mode === "instant") {
        // Convenience: copy password so admin can share it securely.
        try {
          await navigator.clipboard.writeText(variables.password || "");
          toast.success("User created successfully!", { description: "Password copied to clipboard." });
        } catch {
          toast.success("User created successfully!", { description: "Password is set (copy it from the form if needed)." });
        }
      } else {
        toast.success("User created successfully!", {
          description: "An invitation email has been sent to the user to set their password.",
        });
      }

      queryClient.invalidateQueries({ queryKey: ["allUsersDetails"] });
      onOpenChange(false);
      form.reset({ create_mode: "instant", password: generatePassword() });
    },
    onError: (error) => {
      toast.error(`Failed to create user: ${error.message}`);
    },
  });

  const onSubmit = (values: AddUserFormValues) => mutation.mutate(values);

  const handleGeneratePassword = () => {
    form.setValue("password", generatePassword(), { shouldDirty: true, shouldValidate: true });
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(currentPassword);
      toast.success("Password copied");
    } catch {
      toast.error("Could not copy password");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            Create a new user instantly (no email verification) or send an invite link.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <Tabs defaultValue="account" className="py-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="account">Account</TabsTrigger>
                <TabsTrigger value="personal">Personal</TabsTrigger>
                <TabsTrigger value="bank">Bank</TabsTrigger>
                <TabsTrigger value="nominee">Nominee</TabsTrigger>
              </TabsList>

              <TabsContent value="account" className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="create_mode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Creation method</FormLabel>
                      <FormControl>
                        <RadioGroup
                          className="grid gap-3"
                          value={field.value}
                          onValueChange={(v) => {
                            field.onChange(v);
                            if (v === "instant" && !form.getValues("password")) {
                              form.setValue("password", generatePassword(), { shouldDirty: true });
                            }
                          }}
                        >
                          <div className="flex items-start gap-3 rounded-md border p-3">
                            <RadioGroupItem value="instant" id="create_mode_instant" className="mt-1" />
                            <div className="grid gap-1">
                              <Label htmlFor="create_mode_instant">Instant (no email verification)</Label>
                              <p className="text-xs text-muted-foreground">Admin sets a password. User can log in immediately.</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-3 rounded-md border p-3">
                            <RadioGroupItem value="invite" id="create_mode_invite" className="mt-1" />
                            <div className="grid gap-1">
                              <Label htmlFor="create_mode_invite">Invite link</Label>
                              <p className="text-xs text-muted-foreground">User receives an email to set password (standard invite flow).</p>
                            </div>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {mode === "instant" && (
                  <div className="grid gap-2 rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <KeyRound className="h-4 w-4" /> Password
                      </div>
                      <div className="flex items-center gap-2">
                        <Button type="button" variant="outline" size="sm" onClick={handleGeneratePassword}>
                          <RefreshCw className="mr-2 h-4 w-4" /> Generate
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={handleCopyPassword}>
                          <Copy className="mr-2 h-4 w-4" /> Copy
                        </Button>
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input type="text" autoComplete="new-password" {...field} value={field.value ?? ""} />
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-muted-foreground">
                            This password will be set immediately and the email will be marked verified.
                          </p>
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="full_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="personal" className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="dob"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date of Birth</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value ?? undefined}
                            onSelect={field.onChange}
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
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="bank" className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="bank_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bank Name</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bank_account_holder_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Holder</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bank_account_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Number</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} />
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
                        <Input {...field} value={field.value || ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="nominee" className="space-y-4 pt-4">
                <FormField
                  control={form.control}
                  name="nominee_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nominee Name</FormLabel>
                      <FormControl>
                        <Input {...field} value={field.value || ""} />
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
                            <SelectValue placeholder="Select relationship" />
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
                <FormField
                  control={form.control}
                  name="nominee_dob"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Nominee DOB</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={field.value ?? undefined}
                            onSelect={field.onChange}
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
              </TabsContent>
            </Tabs>

            <DialogFooter className="pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "instant" ? "Create User" : "Create User & Send Invite"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};