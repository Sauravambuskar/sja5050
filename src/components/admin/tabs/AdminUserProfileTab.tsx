import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Profile } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, Edit, Calendar as CalendarIcon, Link as LinkIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

const profileSchema = z.object({
  full_name: z.string().min(2, "Name is required.").max(100),
  phone: z.string().optional().nullable(),
  dob: z.date().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  pincode: z.string().optional().nullable(),
  bank_account_holder_name: z.string().optional().nullable(),
  bank_account_number: z.string().optional().nullable(),
  bank_ifsc_code: z.string().optional().nullable(),
  nominee_name: z.string().optional().nullable(),
  nominee_relationship: z.string().optional().nullable(),
  nominee_dob: z.date().optional().nullable(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const fetchUserProfileForAdmin = async (userId: string): Promise<Profile> => {
  const { data, error } = await supabase.rpc('get_user_profile_for_admin', { user_id_to_fetch: userId });
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("User profile not found.");
  return data[0];
};

const DetailRow = ({ label, value, children }: { label: string; value?: string | number | null | undefined, children?: React.ReactNode }) => (
  <div className="flex justify-between items-center text-sm py-1.5 border-b border-dashed">
    <span className="text-muted-foreground">{label}:</span>
    {children ? <div className="text-right">{children}</div> : <span className="font-medium text-right">{value || 'N/A'}</span>}
  </div>
);

interface AdminUserProfileTabProps {
  userId: string;
  onViewUser: (userId: string) => void;
}

export const AdminUserProfileTab = ({ userId, onViewUser }: AdminUserProfileTabProps) => {
  const queryClient = useQueryClient();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const profileForm = useForm<ProfileFormValues>({ resolver: zodResolver(profileSchema) });

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['userProfileForAdmin', userId],
    queryFn: () => fetchUserProfileForAdmin(userId),
    enabled: !!userId,
  });

  useEffect(() => {
    if (profile && isEditingProfile) {
      profileForm.reset({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        dob: profile.dob ? new Date(profile.dob) : null,
        address: profile.address || "",
        city: profile.city || "",
        state: profile.state || "",
        pincode: profile.pincode || "",
        bank_account_holder_name: profile.bank_account_holder_name || "",
        bank_account_number: profile.bank_account_number || "",
        bank_ifsc_code: profile.bank_ifsc_code || "",
        nominee_name: profile.nominee_name || "",
        nominee_relationship: profile.nominee_relationship || "",
        nominee_dob: profile.nominee_dob ? new Date(profile.nominee_dob) : null,
      });
    }
  }, [profile, isEditingProfile, profileForm]);

  const updateProfileMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      if (!userId) throw new Error("User ID is missing.");
      const profileData = { ...values, dob: values.dob ? format(values.dob, 'yyyy-MM-dd') : null, nominee_dob: values.nominee_dob ? format(values.nominee_dob, 'yyyy-MM-dd') : null };
      const { error } = await supabase.functions.invoke('admin-update-profile', { body: { userId, profileData } });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated successfully!");
      queryClient.invalidateQueries({ queryKey: ['userProfileForAdmin', userId] });
      queryClient.invalidateQueries({ queryKey: ['userDetails', userId] });
      queryClient.invalidateQueries({ queryKey: ['allUsersDetails'] });
      setIsEditingProfile(false);
    },
    onError: (error) => { toast.error(`Update failed: ${error.message}`); },
  });

  const onProfileSubmit = (values: ProfileFormValues) => updateProfileMutation.mutate(values);

  if (isProfileLoading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!profile) return <p>Could not load profile.</p>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1.5">
          <CardTitle>User Profile Details</CardTitle>
        </div>
        {!isEditingProfile && (
          <Button variant="outline" size="sm" onClick={() => setIsEditingProfile(true)}>
            <Edit className="mr-2 h-4 w-4" /> Edit
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isEditingProfile ? (
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
              <h4 className="font-semibold">Personal Details</h4>
              <FormField control={profileForm.control} name="full_name" render={({ field }) => (<FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={profileForm.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={profileForm.control} name="dob" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Date of Birth</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>)} />
              <FormField control={profileForm.control} name="address" render={({ field }) => (<FormItem><FormLabel>Address</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
              
              <h4 className="font-semibold pt-4">Bank Details</h4>
              <FormField control={profileForm.control} name="bank_account_holder_name" render={({ field }) => (<FormItem><FormLabel>Account Holder</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={profileForm.control} name="bank_account_number" render={({ field }) => (<FormItem><FormLabel>Account Number</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={profileForm.control} name="bank_ifsc_code" render={({ field }) => (<FormItem><FormLabel>IFSC Code</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />

              <h4 className="font-semibold pt-4">Nominee Details</h4>
              <FormField control={profileForm.control} name="nominee_name" render={({ field }) => (<FormItem><FormLabel>Nominee Name</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={profileForm.control} name="nominee_relationship" render={({ field }) => (<FormItem><FormLabel>Relationship</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value || undefined}><FormControl><SelectTrigger><SelectValue placeholder="Select relationship" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Spouse">Spouse</SelectItem><SelectItem value="Child">Child</SelectItem><SelectItem value="Parent">Parent</SelectItem><SelectItem value="Sibling">Sibling</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent></Select><FormMessage /></FormItem>)} />
              <FormField control={profileForm.control} name="nominee_dob" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Nominee DOB</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP") : <span>Pick a date</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent></Popover><FormMessage /></FormItem>)} />
              
              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={updateProfileMutation.isPending}>{updateProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes</Button>
                <Button type="button" variant="outline" onClick={() => setIsEditingProfile(false)}>Cancel</Button>
              </div>
            </form>
          </Form>
        ) : (
          <div className="space-y-4">
            <div><h4 className="font-semibold mb-2">Account Details</h4><DetailRow label="Referral Code" value={profile.referral_code} /><DetailRow label="Referred By">{profile.referrer_id && profile.referrer_full_name ? (<Button variant="link" className="p-0 h-auto" onClick={() => onViewUser(profile.referrer_id!)}>{profile.referrer_full_name} <LinkIcon className="ml-2 h-3 w-3" /></Button>) : (<span>N/A</span>)}</DetailRow></div>
            <div><h4 className="font-semibold mb-2">Personal Details</h4><DetailRow label="Full Name" value={profile.full_name} /><DetailRow label="Phone" value={profile.phone} /><DetailRow label="Date of Birth" value={profile.dob ? format(new Date(profile.dob), 'PPP') : null} /><DetailRow label="Address" value={`${profile.address || ''}, ${profile.city || ''}, ${profile.state || ''} - ${profile.pincode || ''}`} /></div>
            <div><h4 className="font-semibold mb-2">Bank Details</h4><DetailRow label="Account Holder" value={profile.bank_account_holder_name} /><DetailRow label="Account Number" value={profile.bank_account_number} /><DetailRow label="IFSC Code" value={profile.bank_ifsc_code} /></div>
            <div><h4 className="font-semibold mb-2">Nominee Details</h4><DetailRow label="Nominee Name" value={profile.nominee_name} /><DetailRow label="Relationship" value={profile.nominee_relationship} /><DetailRow label="Nominee DOB" value={profile.nominee_dob ? format(new Date(profile.nominee_dob), 'PPP') : null} /></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};