import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Download, Loader2, Users, Landmark, Banknote } from 'lucide-react';
import { exportToCsv } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { MasterUserReportItem, MasterInvestmentReportItem, MasterTransactionReportItem } from '@/types/database';

const fetchAllUsersData = async (): Promise<MasterUserReportItem[]> => {
    const { data, error } = await supabase.rpc('export_all_users_details');
    if (error) throw new Error(error.message);
    return data || [];
};

const fetchAllInvestmentsData = async (): Promise<MasterInvestmentReportItem[]> => {
    const { data, error } = await supabase.rpc('export_all_investments_details');
    if (error) throw new Error(error.message);
    return data || [];
};

const fetchAllTransactionsData = async (): Promise<MasterTransactionReportItem[]> => {
    const { data, error } = await supabase.rpc('export_all_transactions_details');
    if (error) throw new Error(error.message);
    return data || [];
};

const MasterReports = () => {
    const exportUsersMutation = useMutation({
        mutationFn: fetchAllUsersData,
        onSuccess: (data) => {
            if (data && data.length > 0) {
                const filename = `Master_Users_Report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
                exportToCsv(filename, data);
                toast.success(`Successfully exported ${data.length} user records.`);
            } else {
                toast.info('No user data found to export.');
            }
        },
        onError: (error: Error) => {
            toast.error(`Export failed: ${error.message}`);
        },
    });

    const exportInvestmentsMutation = useMutation({
        mutationFn: fetchAllInvestmentsData,
        onSuccess: (data) => {
            if (data && data.length > 0) {
                const filename = `Master_Investments_Report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
                exportToCsv(filename, data);
                toast.success(`Successfully exported ${data.length} investment records.`);
            } else {
                toast.info('No investment data found to export.');
            }
        },
        onError: (error: Error) => {
            toast.error(`Export failed: ${error.message}`);
        },
    });

    const exportTransactionsMutation = useMutation({
        mutationFn: fetchAllTransactionsData,
        onSuccess: (data) => {
            if (data && data.length > 0) {
                const filename = `Master_Transactions_Report_${format(new Date(), 'yyyy-MM-dd')}.csv`;
                exportToCsv(filename, data);
                toast.success(`Successfully exported ${data.length} transaction records.`);
            } else {
                toast.info('No transaction data found to export.');
            }
        },
        onError: (error: Error) => {
            toast.error(`Export failed: ${error.message}`);
        },
    });

    return (
        <>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Master Reports</h1>
                    <p className="text-muted-foreground">
                        Download comprehensive master data files for the entire organization.
                    </p>
                </div>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            All Users Master Report
                        </CardTitle>
                        <CardDescription>
                            Export a complete CSV file of all users with their profile, bank, nominee, and account details.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={() => exportUsersMutation.mutate()}
                            disabled={exportUsersMutation.isPending}
                            className="w-full"
                        >
                            {exportUsersMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Download className="mr-2 h-4 w-4" />
                            )}
                            Download User Master CSV
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Landmark className="h-5 w-5" />
                            Investments Master Report
                        </CardTitle>
                        <CardDescription>
                            Export a complete CSV file of all investment records across all users.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={() => exportInvestmentsMutation.mutate()}
                            disabled={exportInvestmentsMutation.isPending}
                            className="w-full"
                        >
                            {exportInvestmentsMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Download className="mr-2 h-4 w-4" />
                            )}
                            Download Investments CSV
                        </Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Banknote className="h-5 w-5" />
                            Transactions Master Report
                        </CardTitle>
                        <CardDescription>
                            Export a complete CSV file of all financial transactions, including deposits, withdrawals, and commissions.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={() => exportTransactionsMutation.mutate()}
                            disabled={exportTransactionsMutation.isPending}
                            className="w-full"
                        >
                            {exportTransactionsMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Download className="mr-2 h-4 w-4" />
                            )}
                            Download Transactions CSV
                        </Button>
                    </CardContent>
                </Card>
            </div>
        </>
    );
};

export default MasterReports;