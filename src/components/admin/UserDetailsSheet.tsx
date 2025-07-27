import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { AdminUserView, AdminUserInvestmentHistoryItem, Transaction } from "@/types/database";
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
import { Loader2, ArrowDown, ArrowUp, ArrowRightLeft } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface UserDetailsSheetProps {
  userId: string | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const adjustmentSchema = z.object({
  amount: z.coerce.number().refine(val => val !== 0, { message: "Amount cannot be zero." }),
  description: z.string().min(5, "Description must be at least 5 characters."),
});

const fetchUserDetails = async (userId: string): Promise<AdminUserView> => {
  const { data, error } = await supabase.rpc('get_all_users_details', { search_text: userId });
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("User not found.");
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

export const UserDetailsSheet = ({ userId, isOpen, onOpenChange }: UserDetailsSheetProps) => {
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof adjustmentSchema>>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: { amount: 0, description: "" },
  });

  const { data: user, isLoading: isUserLoading } = useQuery({
    queryKey: ['userDetails', userId],
    queryFn: () => fetchUserDetails(userId!),
    enabled: !!userId && isOpen,
  });

  const { data: investments, isLoading: areInvestmentsLoading } = useQuery({
    queryKey: ['userInvestmentHistory', userId],
    queryFn: () => fetchUserInvestmentHistory(userId!),
    enabled: !!userId && isOpen,
  });

  const { data: transactions, isLoading: areTransactionsLoading } = useQuery({
    queryKey: ['userTransactionHistory', userId],
    queryFn: () => fetchUserTransactions(userId!),
    enabled: !!userId && isOpen,
  });

  const adjustmentMutation = useMutation({
    mutationFn: adjustWallet,
    onSuccess: () => {
      toast.success("Wallet adjusted successfully!");
      queryClient.invalidateQueries({ queryKey: ['userDetails', userId] });
      queryClient.invalidateQueries({ queryKey: ['allUsersDetails'] });
      queryClient.invalidateQueries({ queryKey: ['userTransactionHistory', userId] });
      form.reset();
    },
    onError: (error) => { toast.error(`Adjustment failed: ${error.message}`); },
  });

  const onAdjustmentSubmit = (values: z.infer<typeof adjustmentSchema>) => {
    if (!userId) return;
    adjustmentMutation.mutate({
      userId,
      amount: values.amount,
      description: values.description,
    });
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'Deposit': case 'Commission': case 'Adjustment (Credit)': return <ArrowDown className="h-4 w-4 text-green-500" />;
      case 'Withdrawal': case 'Investment': case 'Adjustment (Debit)': return <ArrowUp className="h-4 w-4 text-red-500" />;
      default: return <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const renderContent = () => {
    if (isUserLoading) return <div className="flex items-center justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    if (!user) return <div className="p-8 text-center text-muted-foreground">User not found.</div>;

    return (
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-foreground">Account Information</h3>
          <Separator className="my-2" />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Email:</span><span>{user.email}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Joined:</span><span>{new Date(user.join_date).toLocaleDateString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">KYC Status:</span><Badge variant={user.kyc_status === "Approved" ? "default" : "outline"}>{user.kyc_status}</Badge></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Wallet Balance:</span><span className="font-mono">₹{user.wallet_balance.toLocaleString('en-IN')}</span></div>
          </div>
        </div>
        
        <Tabs defaultValue="transactions">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="investments">Investments</TabsTrigger>
            <TabsTrigger value="adjust">Adjust Wallet</TabsTrigger>
          </TabsList>
          <TabsContent value="transactions" className="mt-4">
            <Card><CardHeader><CardTitle>Transaction History</CardTitle></CardHeader><CardContent>
              <Table>
                <TableHeader><TableRow><TableHead className="w-[50px]"></TableHead><TableHead>Details</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                <TableBody>
                  {areTransactionsLoading ? ([...Array(3)].map((_, i) => (<TableRow key={i}><TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell><TableCell><Skeleton className="h-4 w-24" /></TableCell><TableCell className="text-right"><Skeleton className="h-4 w-16" /></TableCell></TableRow>))) : transactions && transactions.length > 0 ? (transactions.map((txn) => (<TableRow key={txn.id}><TableCell><div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">{getTransactionIcon(txn.type)}</div></TableCell><TableCell><div className="font-medium">{txn.description || txn.type}</div><div className="text-xs text-muted-foreground">{format(new Date(txn.created_at), "PPP")}</div></TableCell><TableCell className="text-right font-mono">₹{txn.amount.toLocaleString('en-IN')}</TableCell></TableRow>))) : (<TableRow><TableCell colSpan={3} className="h-24 text-center">No transactions found.</TableCell></TableRow>)}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>
          <TabsContent value="investments" className="mt-4">
            <Card><CardHeader><CardTitle>Investment History</CardTitle></CardHeader><CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Plan</TableHead><TableHead>Start Date</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                <TableBody>
                  {areInvestmentsLoading ? ([...Array(2)].map((_, i) => (<TableRow key={i}><TableCell><Skeleton className="h-4 w-24" /></TableCell><TableCell><Skeleton className="h-4 w-20" /></TableCell><TableCell className="text-right"><Skeleton className="h-4 w-16" /></TableCell></TableRow>))) : investments && investments.length > 0 ? (investments.map((inv) => (<TableRow key={inv.id}><TableCell>{inv.plan_name}</TableCell><TableCell>{format(new Date(inv.start_date), "PPP")}</TableCell><TableCell className="text-right font-mono">₹{inv.investment_amount.toLocaleString('en-IN')}</TableCell></TableRow>))) : (<TableRow><TableCell colSpan={3} className="h-24 text-center">No investments found.</TableCell></TableRow>)}
                </TableBody>
              </Table>
            </CardContent></Card>
          </TabsContent>
          <TabsContent value="adjust" className="mt-4">
            <Card><CardHeader><CardTitle>Manual Wallet Adjustment</CardTitle><CardDescription>Credit or debit the user's wallet. Use a negative value for debits.</CardDescription></CardHeader><CardContent>
              <Form {...form}><form onSubmit={form.handleSubmit(onAdjustmentSubmit)} className="space-y-4">
                <FormField control={form.control} name="amount" render={({ field }) => (<FormItem><FormLabel>Amount (₹)</FormLabel><FormControl><Input type="number" step="any" {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Reason / Description</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <Button type="submit" disabled={adjustmentMutation.isPending}>{adjustmentMutation.isPending ? "Processing..." : "Submit Adjustment"}</Button>
              </form></Form>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isUserLoading ? <Skeleton className="h-6 w-40" /> : user?.full_name || "User Details"}</SheetTitle>
          <SheetDescription>A complete overview of the user's account and activity.</SheetDescription>
        </SheetHeader>
        <div className="mt-6">
          {renderContent()}
        </div>
      </SheetContent>
    </Sheet>
  );
};