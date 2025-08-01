import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

type AuditLog = {
  id: string;
  admin_email: string;
  action: string;
  target_user_id: string;
  details: any;
  created_at: string;
};

const fetchAuditLogs = async (): Promise<AuditLog[]> => {
  const { data, error } = await supabase
    .from('admin_audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100); // Limit to the last 100 events for performance

  if (error) throw new Error(error.message);
  return data;
};

const AuditLog = () => {
  const { data: logs, isLoading, isError, error } = useQuery<AuditLog[]>({
    queryKey: ['adminAuditLog'],
    queryFn: fetchAuditLogs,
  });

  const formatAction = (action: string) => {
    return action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <>
      <h1 className="text-3xl font-bold">Admin Audit Log</h1>
      <p className="text-muted-foreground">A record of all administrative actions taken on the platform.</p>
      
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent Actions</CardTitle>
          <CardDescription>Showing the last 100 administrative events.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Timestamp</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow><TableCell colSpan={4} className="text-center text-red-500">Error: {error.message}</TableCell></TableRow>
              ) : (
                logs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-sm text-muted-foreground">{format(new Date(log.created_at), "PPP p")}</TableCell>
                    <TableCell>{log.admin_email}</TableCell>
                    <TableCell><Badge variant="secondary">{formatAction(log.action)}</Badge></TableCell>
                    <TableCell className="text-sm font-mono">{JSON.stringify(log.details)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
};

export default AuditLog;