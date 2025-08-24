import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Download, Loader2, Users } from 'lucide-react';
import { exportToCsv } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { MasterUserReportItem } from '@/types/database';

const fetchAllUsersData = async (): Promise<MasterUserReportItem[]> => {
    const { data, error } = await supabase.rpc('export_all_users_details');
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

                <Card className="border-dashed">
                    <CardHeader>
                        <CardTitle className="text-muted-foreground">
                            Investments Master Report
                        </CardTitle>
                        <CardDescription>
                            (Coming Soon) Export all investment records.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button disabled className="w-full">Download</Button>
                    </CardContent>
                </Card>

                <Card className="border-dashed">
                    <CardHeader>
                        <CardTitle className="text-muted-foreground">
                            Transactions Master Report
                        </CardTitle>
                        <CardDescription>
                            (Coming Soon) Export all financial transactions.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button disabled className="w-full">Download</Button>
                    </CardContent>
                </Card>
            </div>
        </>
    );
};

export default MasterReports;