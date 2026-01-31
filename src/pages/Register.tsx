import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { useEffect } from "react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useIsMobile } from "@/hooks/use-mobile";

const schema = z.object({
  full_name: z.string().min(2, "Full name is required").max(100),
  phone: z
    .string()
    .min(7, "Phone number is required")
    .max(20, "Phone number is too long"),
  dob: z.date({ required_error: "Date of birth is required" }),
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),

  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  pincode: z.string().optional().nullable(),

  referral_code: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof schema>;

function Register() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [searchParams] = useSearchParams();
  const referralCodeFromUrl = searchParams.get("ref") || "";
  const isMobile = useIsMobile();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      full_name: "",
      phone: "",
      dob: undefined as unknown as Date,
      email: "",
      password: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      referral_code: referralCodeFromUrl,
    },
  });

  useEffect(() => {
    if (session) {
      navigate("/");
    }
  }, [session, navigate]);

  const onSubmit = async (values: FormValues) => {
    const dobStr = values.dob ? format(values.dob, "yyyy-MM-dd") : null;

    const { data, error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: values.full_name,
          phone: values.phone,
          dob: dobStr,
          address: values.address || "",
          city: values.city || "",
          state: values.state || "",
          pincode: values.pincode || "",
          referral_code: values.referral_code || "",
        },
      },
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    // If email confirmations are enabled, session may be null here.
    if (!data.session) {
      toast.success("Account created", {
        description: "Please check your email to verify your account, then sign in.",
      });
      navigate("/login");
      return;
    }

    // For setups without email confirmation.
    try {
      const referral = (values.referral_code || "").trim();
      if (referral) {
        const { error: refErr } = await supabase.rpc("set_my_referrer_by_code", {
          p_referral_code: referral,
        });
        if (refErr) toast.error(refErr.message);
      }
    } catch {
      // ignore
    }

    toast.success("Welcome!", { description: "Your account is ready." });
    navigate("/");
  };

  const PersonalFields = (
    <div className={cn("grid gap-4", !isMobile && "md:grid-cols-2")}> 
      <FormField
        control={form.control}
        name="full_name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Full Name</FormLabel>
            <FormControl>
              <Input placeholder="Enter your full name" autoComplete="name" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="phone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Mobile Number</FormLabel>
            <FormControl>
              <Input
                type="tel"
                placeholder="Enter your mobile number"
                autoComplete="tel"
                inputMode="tel"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {isMobile ? (
        <FormField
          control={form.control}
          name="dob"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date of Birth</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                  onChange={(e) => {
                    const v = e.target.value;
                    field.onChange(v ? new Date(v) : undefined);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : (
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
                      type="button"
                      variant="outline"
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
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    captionLayout="dropdown-buttons"
                    fromYear={1940}
                    toYear={new Date().getFullYear()}
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <FormField
        control={form.control}
        name="referral_code"
        render={({ field }) => (
          <FormItem className={cn(!isMobile && "md:col-span-2")}>
            <FormLabel>Referral Code (Optional)</FormLabel>
            <FormControl>
              <Input placeholder="Enter referral code" {...field} value={field.value ?? ""} />
            </FormControl>
            <FormMessage />
            <p className="text-xs text-muted-foreground">If provided, this links your account to your sponsor.</p>
          </FormItem>
        )}
      />
    </div>
  );

  const AccountFields = (
    <div className={cn("grid gap-4", !isMobile && "md:grid-cols-2")}>
      <FormField
        control={form.control}
        name="email"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Email Address</FormLabel>
            <FormControl>
              <Input type="email" placeholder="you@example.com" autoComplete="email" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="password"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Password</FormLabel>
            <FormControl>
              <Input type="password" placeholder="Min 8 characters" autoComplete="new-password" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  const AddressFields = (
    <div className={cn("grid gap-4", !isMobile && "md:grid-cols-2")}>
      <FormField
        control={form.control}
        name="address"
        render={({ field }) => (
          <FormItem className={cn(!isMobile && "md:col-span-2")}>
            <FormLabel>Address (Optional)</FormLabel>
            <FormControl>
              <Input placeholder="House/Street" {...field} value={field.value ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="city"
        render={({ field }) => (
          <FormItem>
            <FormLabel>City (Optional)</FormLabel>
            <FormControl>
              <Input placeholder="City" {...field} value={field.value ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="state"
        render={({ field }) => (
          <FormItem>
            <FormLabel>State (Optional)</FormLabel>
            <FormControl>
              <Input placeholder="State" {...field} value={field.value ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="pincode"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Pincode (Optional)</FormLabel>
            <FormControl>
              <Input placeholder="Pincode" inputMode="numeric" {...field} value={field.value ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  return (
    <AuthLayout>
      <Card className="w-full max-w-md border-0 shadow-none sm:max-w-lg sm:border sm:shadow-sm md:max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Sign Up</CardTitle>
          <CardDescription>Create your account to start investing.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {isMobile ? (
                <div className="space-y-4">
                  <Tabs defaultValue="personal" className="w-full">
                    <div className="w-full overflow-x-auto pb-2">
                      <TabsList className="w-max">
                        <TabsTrigger value="personal">Personal</TabsTrigger>
                        <TabsTrigger value="account">Account</TabsTrigger>
                        <TabsTrigger value="address">Address</TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent value="personal" className="mt-0">
                      {PersonalFields}
                    </TabsContent>
                    <TabsContent value="account" className="mt-0">
                      {AccountFields}
                    </TabsContent>
                    <TabsContent value="address" className="mt-0">
                      {AddressFields}
                    </TabsContent>
                  </Tabs>

                  <div className="sticky bottom-0 -mx-6 border-t bg-background/90 px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/70">
                    <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>

                    <div className="mt-3 text-center text-sm">
                      Already have an account?{" "}
                      <Link to="/login" className="underline">
                        Sign in
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {PersonalFields}
                  {AccountFields}
                  {AddressFields}

                  <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>

                  <div className="text-center text-sm">
                    Already have an account?{" "}
                    <Link to="/login" className="underline">
                      Sign in
                    </Link>
                  </div>
                </>
              )}
            </form>
          </Form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}

export default Register;