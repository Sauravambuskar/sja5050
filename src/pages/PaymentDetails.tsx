import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/auth/AuthProvider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { InvestorPaymentDetail, Profile } from "@/types/database";
import { format } from "date-fns";
import React from 'react';

const fetchInvestorPaymentDetails = async (userId: string): Promise<InvestorPaymentDetail[]> => {
  const { data, error } = await supabase.rpc('get_my_investor_payment_details');
  if (error) throw new Error(error.message);
  return data;
};

const fetchProfile = async (userId: string): Promise<Profile> => {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw new Error(error.message);
  return data;
};

const PaymentDetails = () => {
  const { user } = useAuth();

  const { data: investorPayments, isLoading: isLoadingPayments } = useQuery<InvestorPaymentDetail[]>({
    queryKey: ['investorPaymentDetails', user?.id],
    queryFn: () => fetchInvestorPaymentDetails(user!.id),
    enabled: !!user?.id,
  });

  const { data: profile, isLoading: isLoadingProfile } = useQuery<Profile>({
    queryKey: ['profile', user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user?.id,
  });

  const renderSkeletonRow = () => (
    <TableRow>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
    </TableRow>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Payment Details</h1>
      <p className="text-muted-foreground">A detailed breakdown of your earnings for the current month.</p>

      <Card>
        <CardHeader>
          <CardTitle>Your Information</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingProfile ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-8 w-full" /></div>
              <div className="space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-8 w-full" /></div>
              <div className="space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-8 w-full" /></div>
              <div className="space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-8 w-full" /></div>
              <div className="space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-8 w-full" /></div>
              <div className="space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-8 w-full" /></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">ID</p>
                <p className="text-lg font-semibold">{profile?.member_id || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Full Name</p>
                <p className="text-lg font-semibold">{profile?.full_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Bank Name</p>
                <p className="text-lg font-semibold">{profile?.bank_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Account Holder Name</p>
                <p className="text-lg font-semibold">{profile?.bank_account_holder_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Account No</p>
                <p className="text-lg font-semibold">{profile?.bank_account_number || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">IFSC Code</p>
                <p className="text-lg font-semibold">{profile?.bank_ifsc_code || 'N/A'}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Investor Payment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invt Id</TableHead>
                  <TableHead>Invt Date</TableHead>
                  <TableHead>Invt Amount</TableHead>
                  <TableHead>%</TableHead>
                  <TableHead>Per Day</TableHead>
                  <TableHead>Total Days</TableHead>
                  <TableHead>Total Interest</TableHead>
                  <TableHead>Month Amount</TableHead>
                  <TableHead>Yearly Amount</TableHead> {/* New Column Header */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingPayments ? (
                  Array.from({ length: 5 }).map((_, i) => <React.Fragment key={i}>{renderSkeletonRow()}</React.Fragment>)
                ) : investorPayments && investorPayments.length > 0 ? (
                  investorPayments.map((payment) => (
                    <TableRow key={payment.invt_id}>
                      <TableCell>{payment.invt_id}</TableCell>
                      <TableCell>{format(new Date(payment.invt_date), 'dd-MM-yyyy')}</TableCell>
                      <TableCell>₹{payment.invt_amount.toFixed(2)}</TableCell>
                      <TableCell>{payment.rate.toFixed(2)}</TableCell>
                      <TableCell>₹{payment.per_day_amount.toFixed(2)}</TableCell>
                      <TableCell>{payment.total_days}</TableCell>
                      <TableCell>₹{payment.total_interest.toFixed(2)}</TableCell>
                      <TableCell>₹{payment.month_amount.toFixed(2)}</TableCell>
                      <TableCell>₹{(payment.yearly_amount ?? 0).toFixed(2)}</TableCell> {/* Display Yearly Amount */}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">No active investments found.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentDetails;