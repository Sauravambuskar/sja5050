import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Profile } from '@/types/database';
import { format } from 'date-fns';

type InvestorPayment = {
  invt_id: string;
  invt_date: string;
  invt_amount: number;
  rate: number;
  per_day_amount: number;
  total_days: number;
  total_interest: number;
  month_amount: number;
};

type IntroducerPayment = InvestorPayment & { name: string; amount: number };

const fetchMyProfile = async () => {
  const { data, error } = await supabase.rpc('get_my_profile');
  if (error) throw error;
  return data[0] as Profile;
};

const fetchMyInvestorPayments = async () => {
  const { data, error } = await supabase.rpc('get_my_investor_payment_details');
  if (error) throw error;
  return data as InvestorPayment[];
};

const fetchMyIntroducerPayments = async () => {
  const { data, error } = await supabase.rpc('get_my_introducer_payment_details');
  if (error) throw error;
  return data as IntroducerPayment[];
};

const PaymentDetails = () => {
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['myProfileForPaymentDetails'],
    queryFn: fetchMyProfile,
  });

  const { data: investorPayments, isLoading: investorLoading } = useQuery({
    queryKey: ['myInvestorPayments'],
    queryFn: fetchMyInvestorPayments,
  });

  const { data: introducerPayments, isLoading: introducerLoading } = useQuery({
    queryKey: ['myIntroducerPayments'],
    queryFn: fetchMyIntroducerPayments,
  });

  const investorTotals = investorPayments?.reduce((acc, p) => ({
    amount: acc.amount + p.invt_amount,
    interest: acc.interest + p.total_interest,
    month: acc.month + p.month_amount,
  }), { amount: 0, interest: 0, month: 0 }) || { amount: 0, interest: 0, month: 0 };

  const introducerTotals = introducerPayments?.reduce((acc, p) => ({
    amount: acc.amount + p.amount,
    interest: acc.interest + p.total_interest,
    month: acc.month + p.month_amount,
  }), { amount: 0, interest: 0, month: 0 }) || { amount: 0, interest: 0, month: 0 };

  return (
    <>
      <h1 className="text-3xl font-bold">Payment Details</h1>
      <p className="text-muted-foreground">
        A detailed breakdown of your earnings for the current month.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Your Information</CardTitle>
        </CardHeader>
        <CardContent>
          {profileLoading ? <Skeleton className="h-10 w-full" /> : (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div><Label>ID</Label><Input value={profile?.member_id || 'N/A'} readOnly /></div>
              <div><Label>Full Name</Label><Input value={profile?.full_name || 'N/A'} readOnly /></div>
              <div><Label>Bank Name</Label><Input value={profile?.bank_account_holder_name || 'N/A'} readOnly /></div>
              <div><Label>Account No</Label><Input value={profile?.bank_account_number || 'N/A'} readOnly /></div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader><CardTitle>Investor Payment</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Invt Id</TableHead><TableHead>Invt Date</TableHead><TableHead>Invt Amount</TableHead><TableHead>%</TableHead><TableHead>Per Day</TableHead><TableHead>Total Days</TableHead><TableHead>Total Interest</TableHead><TableHead>Month Amount</TableHead></TableRow></TableHeader>
            <TableBody>
              {investorLoading ? <TableRow><TableCell colSpan={8}><Skeleton className="h-10 w-full" /></TableCell></TableRow> :
                investorPayments?.map(p => (
                  <TableRow key={p.invt_id}>
                    <TableCell>{p.invt_id}</TableCell>
                    <TableCell>{format(new Date(p.invt_date), 'dd-MM-yyyy')}</TableCell>
                    <TableCell>{p.invt_amount}</TableCell>
                    <TableCell>{p.rate}</TableCell>
                    <TableCell>{p.per_day_amount}</TableCell>
                    <TableCell>{p.total_days}</TableCell>
                    <TableCell>{p.total_interest}</TableCell>
                    <TableCell>{p.month_amount}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
            <TableFooter><TableRow className="bg-muted font-bold"><TableCell colSpan={2}>Total</TableCell><TableCell>{investorTotals.amount}</TableCell><TableCell colSpan={3}></TableCell><TableCell>{investorTotals.interest}</TableCell><TableCell>{investorTotals.month}</TableCell></TableRow></TableFooter>
          </Table>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader><CardTitle>Introducer Payment</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Invt Id</TableHead><TableHead>Name</TableHead><TableHead>Amount</TableHead><TableHead>%</TableHead><TableHead>Per Day</TableHead><TableHead>Total Days</TableHead><TableHead>Total Interest</TableHead><TableHead>Month Amount</TableHead></TableRow></TableHeader>
            <TableBody>
              {introducerLoading ? <TableRow><TableCell colSpan={8}><Skeleton className="h-10 w-full" /></TableCell></TableRow> :
                introducerPayments?.map(p => (
                  <TableRow key={p.invt_id}>
                    <TableCell>{p.invt_id}</TableCell>
                    <TableCell>{p.name}</TableCell>
                    <TableCell>{p.amount}</TableCell>
                    <TableCell>{p.rate}</TableCell>
                    <TableCell>{p.per_day_amount}</TableCell>
                    <TableCell>{p.total_days}</TableCell>
                    <TableCell>{p.total_interest}</TableCell>
                    <TableCell>{p.month_amount}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
            <TableFooter><TableRow className="bg-muted font-bold"><TableCell colSpan={2}>Total</TableCell><TableCell>{introducerTotals.amount}</TableCell><TableCell colSpan={3}></TableCell><TableCell>{introducerTotals.interest}</TableCell><TableCell>{introducerTotals.month}</TableCell></TableRow></TableFooter>
          </Table>
        </CardContent>
      </Card>
    </>
  );
};

export default PaymentDetails;