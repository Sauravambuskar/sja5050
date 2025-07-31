import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { AdminUserView, AdminUserInvestmentHistoryItem, Transaction, Profile } from "@/types/database";
import { Separator } from "@/components/ui/separator";
import { Badge } from "../ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Skeleton } from "../ui/skeleton";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "../ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, ArrowDown, ArrowUp, ArrowRightLeft, Edit, X, Calendar as CalendarIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Calendar } from "../ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

interface UserDetailsSheetProps {
  userId: string | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const adjustmentSchema = z.object({
  amount: z.coerce.number().refine(val => val !== 0, { message: "Amount cannot be zero." }),
  description: z.string().min(5, "Description must be at least 5 characters."),
});

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

type AdjustmentFormValues = z.infer<typeof adjustmentSchema>;
type ProfileFormValues = z.infer<typeof profileSchema>;

const fetchUserDetails = async (userId: string): Promise<AdminUserView> => {
  const { data, error } = await supabase.rpc('get_all_users_details', { search_text: userId });
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("User not found.");
  return data[0];
};

const fetchUserProfileForAdmin = async (userId: string): Promise<Profile> => {
  const { data, error } = await supabase.rpc('get_user_profile_for_admin', { user_id_to_fetch: userId });
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("User profile not found.");
  return data[0];
};

const fetchUserInvestmentHistory = async (userId: string): Promise<AdminUserInvestmentHistoryItem[]> => {
  const { data, error } = await supabase.rpc('get_user_investment_history_for_admin', { user_id_to_fetch: userId });
  if (error) throw new Error(error.message);
  return data;
};

const fetchUserTransactions = async (userId: string): Promise<Transaction[]> => {
  const { data, error } = await supabase.rpc('get_user_transactions_for_admin', { user_id_to_fetch: userId });
  if (error) throw new Error(error.message);
  return data;
};

const adjustWallet = async ({ userId, amount, description }: { userId: string; amount: number; description: string }) => {
  const { data, error } = await supabase.functions.invoke('admin-adjust-wallet', { body: { userId, amount, description } });
  if (error) throw new Error(error.message);
  if (data.error) throw new Error(data.error);
  return data;
};

const fetchReferrerName = async (referrerId: string | null): Promise<string | null> => {
  if (!referrerId) return null;
  const { data, error } = await supabase.from('profiles').select('full_name').eq('id', referrerId).single();
  if (error) { console.error("Error fetching referrer name:", error); return 'Unknown'; }
  return data?.full_name || 'Unknown';
};

const fetchReferralCount = async (userId: string): Promise<number> => {
  const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('referrer_id', userId);
  if (error) { console.error("Error fetching referral count:", error); return 0; }
  return count || 0;
};

const DetailRow = ({ label, value, isLoading }: { label: string; value: string | number | null | undefined, isLoading?: boolean }) => (
  <div className="flex justify-between text-sm py-1.5 border-b border-dashed">
    <span className="text-muted-foreground">{label}:</span>
    {isLoading ? <Skeleton className="h-4 w-24" /> : <span className="font-medium text-right">{value || 'N/A'}</span>}
  </div>
);

export const UserDetailsSheet = ({ userId, isOpen, onOpenChange }: UserDetailsSheetProps) => {
  const queryClient = useQueryClient();
  const [adjustmentDetails, setAdjustmentDetails] = useState<AdjustmentFormValues | null>(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  const adjustmentForm = useForm<AdjustmentFormValues>({ resolver: zodResolver(adjustmentSchema), defaultValues: { amount: 0, description: "" } });
  const profileForm = useForm<ProfileFormValues>({ resolver: zodResolver(profileSchema) });

  const { data: user, isLoading: isUserLoading } = useQuery({ queryKey: ['userDetails', userId], queryFn: () => fetchUserDetails(userId!), enabled: !!userId && isOpen });
  const { data: profile, isLoading: isProfileLoading } = useQuery({ queryKey: ['userProfileForAdmin', userId], queryFn: () => fetchUserProfileForAdmin(userId!), enabled: !!userId && isOpen });
  const { data: investments, isLoading: areInvestmentsLoading } = useQuery({ queryKey: ['userInvestmentHistory', userId], queryFn: () => fetchUserInvestmentHistory(userId!), enabled: !!userId && isOpen });
  const { data: transactions, isLoading: areTransactionsLoading } = useQuery({ queryKey: ['userTransactionHistory', userId], queryFn: () => fetchUserTransactions(userId!), enabled: !!userId && isOpen });
  const { data: referrerName, isLoading: isReferrerLoading } = useQuery({ queryKey: ['referrerName', profile?.referrer_id], queryFn: () => fetchReferrerName(profile!.referrer_id), enabled: !!profile?.referrer_id && isOpen });
  const { data: referralCount, isLoading: isReferralCountLoading } = useQuery({ queryKey: ['referralCount', userId], queryFn: () => fetchReferralCount(userId!), enabled: !!userId && isOpen });

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

  const adjustmentMutation = useMutation({
    mutationFn: adjustWallet,
    onSuccess: () => {
      toast.success("Wallet adjusted successfully!");
      queryClient.invalidateQueries({ queryKey: ['userDetails', userId] });
      queryClient.invalidateQueries({ queryKey: ['allUsersDetails'] });
      queryClient.invalidateQueries({ queryKey: ['userTransactionHistory', userId] });
      adjustmentForm.reset();
      setAdjustmentDetails(null);
    },
    onError: (error) => { toast.error(`Adjustment failed: ${error.message}`); setAdjustmentDetails(null); },
  });

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

  const onAdjustmentSubmit = (values: AdjustmentFormValues) => setAdjustmentDetails(values);
  const onProfileSubmit = (values: ProfileFormValues) => updateProfileMutation.mutate(values);
  const handleConfirmAdjustment = () => { if (!userId || !adjustmentDetails) return; adjustmentMutation.mutate({ userId, amount: adjustmentDetails.amount, description: adjustmentDetails.description }); };
  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'Deposit': case 'Commission': case 'Adjustment (Credit)': return <ArrowDown className="h-4 w-4 text-green-500" />;
      case 'Withdrawal': case 'Investment': case 'Adjustment (Debit)': return <ArrowUp className="h-4 w-4 text-red-500" />;
      default: return <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const renderProfileContent = () => {
    if (isProfileLoading) return <Loader2 className="h-6 w-6 animate-spin" />;
    if (!profile) return <p>Could not load profile.</p>;

    if (isEditingProfile) {
      return (
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
      );
    }

    return (
      <div className="space-y-4">
        <div><h4 className="font-semibold mb-2">Personal Details</h4><DetailRow label="Full Name" value={profile.full_name} /><DetailRow label="Phone" value={profile.phone} /><DetailRow label="Date of Birth" value={profile.dob ? format(new Date(profile.dob), 'PPP') : null} /><DetailRow label="Address" value={`${profile.address || ''}, ${profile.city || ''}, ${profile.state || ''} - ${profile.pincode || ''}`} /></div>
        <div><h4 className="font-semibold mb-2">Bank Details</h4><DetailRow label="Account Holder" value={profile.bank_account_holder_name} /><DetailRow label="Account Number" value={profile.bank_account_number} /><DetailRow label="IFSC Code" value={profile.bank_ifsc_code} /></div>
        <div><h4 className="font-semibold mb-2">Nominee Details</h4><DetailRow label="Nominee Name" value={profile.nominee_name} /><DetailRow label="Relationship" value={profile.nominee_relationship} /><DetailRow label="Nominee DOB" value={profile.nominee_dob ? format(new Date(profile.nominee_dob), 'PPP') : null} /></div>
        <div><h4 className="font-semibold mb-2 mt-4">Referral Details</h4><DetailRow label="Referred By" value={referrerName || 'Direct Signup'} isLoading={isReferrerLoading} /><DetailRow label="Total Referrals" value={referralCount} isLoading={isReferralCountLoading} /></div>
      </div>
    );
  };

  const renderContent = () => {
    if (isUserLoading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    if (!user) return <div className="p-8 text-center text-muted-foreground">User not found.</div>;

    return (
      <div className="space-y-6">
        <div><h3 className="font-semibold text-foreground">Account Information</h3><Separator className="my-2" /><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Email:</span><span>{user.email}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Joined:</span><span>{new Date(user.join_date).toLocaleDateString()}</span></div><div className="flex justify-between"><span className="text-muted-foreground">KYC Status:</span><Badge variant={user.kyc_status === "Approved" ? "default" : "outline"}>{user.kyc_status}</Badge></div><div className="flex justify-between"><span className="text-muted-foreground">Wallet Balance:</span><span className="font-mono">₹{user.wallet_balance.toLocaleString('en-IN')}</span></div></div></div>
        <Tabs defaultValue="profile">
          <TabsList className="grid w-full grid-cols-4"><TabsTrigger value="profile">Profile</TabsTrigger><TabsTrigger value="transactions">Transactions</TabsTrigger><TabsTrigger value="investments">Investments</TabsTrigger><TabsTrigger value="adjust">Adjust Wallet</TabsTrigger></TabsList>
          <TabsContent value="profile" className="mt-4"><Card><CardHeader className="flex flex-row items-center justify-between"><div className="space-y-1.5"><CardTitle>User Profile Details</CardTitle></div>{!isEditingProfile && (<Button variant="outline" size="sm" onClick={() => setIsEditingProfile(true)}><Edit className="mr-2 h-4 w-4" /> Edit</Button>)}</CardHeader><CardContent>{renderProfileContent()}</CardContent></Card></TabsContent>
          <TabsContent value="transactions" className="mt-4"><Card><CardHeader><CardTitle>Transaction History</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead className="w-[50px]"></TableHead><TableHead>Details</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader><TableBody>{areTransactionsLoading ? ([...Array(3)].map((_, i) => (<TableRow key={i}><TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell><TableCell><Skeleton className="h-4 w-24" /></TableCell><TableCell className="text-right"><Skeleton className="h-4 w-16" /></TableCell></TableRow>))) : transactions && transactions.length > 0 ? (transactions.map((txn) => (<TableRow key={txn.id}><TableCell><div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">{getTransactionIcon(txn.type)}</div></TableCell><TableCell><div className="font-medium">{txn.description || txn.type}</div><div className="text-xs text-muted-foreground">{format(new Date(txn.created_at), "PPP")}</div></TableCell><TableCell className="text-right font-mono">₹{txn.amount.toLocaleString('en-IN')}</TableCell></TableRow>))) : (<TableRow><TableCell colSpan={3} className="h-24 text-center">No transactions found.</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></TabsContent>
          <TabsContent value="investments" className="mt-4"><Card><CardHeader><CardTitle>Investment History</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Plan</TableHead><TableHead>Start Date</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader><TableBody>{areInvestmentsLoading ? ([...Array(2)].map((_, i) => (<TableRow key={i}><TableCell><Skeleton className="h-4 w-24" /></TableCell><TableCell><Skeleton className="h-4 w-20" /></TableCell><TableCell className="text-right"><Skeleton className="h-4 w-16" /></TableCell></TableRow>))) : investments && investments.length > 0 ? (investments.map((inv) => (<TableRow key={inv.id}><TableCell>{inv.plan_name}</TableCell><TableCell>{format(new Date(inv.start_date), "PPP")}</TableCell><TableCell className="text-right font-mono">₹{inv.investment_amount.toLocaleString('en-IN')}</TableCell></TableRow>))) : (<TableRow><TableCell colSpan={3} className="h-24 text-center">No investments found.</TableCell></TableRow>)}</TableBody></Table></CardContent></Card></TabsContent>
          <TabsContent value="adjust" className="mt-4"><Card><CardHeader><CardTitle>Manual Wallet Adjustment</CardTitle><CardDescription>Credit or debit the user's wallet. Use a negative value for debits.</CardDescription></CardHeader><CardContent><Form {...adjustmentForm}><form onSubmit={adjustmentForm.handleSubmit(onAdjustmentSubmit)} className="space-y-4"><FormField control={adjustmentForm.control} name="amount" render={({ field }) => (<FormItem><FormLabel>Amount (₹)</FormLabel><FormControl><Input type="number" step="any" {...field} /></FormControl><FormMessage /></FormItem>)} /><FormField control={adjustmentForm.control} name="description" render={({ field }) => (<FormItem><FormLabel>Reason / Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} /><Button type="submit" disabled={adjustmentMutation.isPending}>Submit Adjustment</Button></form></Form></CardContent></Card></TabsContent>
        </Tabs>
      </div>
    );
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}><SheetContent className="sm:max-w-2xl w-full overflow-y-auto"><SheetHeader><SheetTitle>{isUserLoading ? <Skeleton className="h-6 w-40" /> : user?.full_name || "User Details"}</SheetTitle><SheetDescription>A complete overview of the user's account and activity.</SheetDescription></SheetHeader><div className="mt-6">{renderContent()}</div></SheetContent></Sheet>
      <AlertDialog open={!!adjustmentDetails} onOpenChange={(isOpen) => !isOpen && setAdjustmentDetails(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirm Wallet Adjustment</AlertDialogTitle><AlertDialogDescription>You are about to {adjustmentDetails?.amount ?? 0 > 0 ? 'credit' : 'debit'} the wallet for <span className="font-semibold">{user?.full_name}</span> by <span className="font-semibold">₹{Math.abs(adjustmentDetails?.amount ?? 0).toLocaleString()}</span>.<br />Reason: "{adjustmentDetails?.description}"<br /><br />Are you sure you want to proceed? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmAdjustment} disabled={adjustmentMutation.isPending}>{adjustmentMutation.isPending ? "Processing..." : "Confirm"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  );
};