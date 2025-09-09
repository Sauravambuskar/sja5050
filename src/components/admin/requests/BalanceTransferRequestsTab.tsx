import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useDebounce } from '@/hooks/useDebounce';
import { AdminRequestFilters } from '../AdminRequestFilters';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PaginationControls } from '@/components/ui/PaginationControls';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

const PAGE_SIZE = 10;

const fetchTransfers = async (status: string, search: string, page: number) => {
  const { data, error } = await supabase.rpc('get_all_balance_transfers', {
    p_status_filter: status === 'all' ? null : status,
    p_search_text: search || null,
    p_limit: PAGE_SIZE,
    p_offset: page * PAGE_SIZE,
  });
  if (error) throw new Error(error.message);
  return data;
};

const fetchTransfersCount = async (status: string, search: string) => {
  const { data, error } = await supabase.rpc('get_all_balance_transfers_count', {
    p_status_filter: status === 'all' ? null : status,
    p_search_text: search || null,
  });
  if (error) throw new Error(error.message);
  return data;
};

const processTransfer = async ({ requestId, newStatus, adminNotes }: { requestId: string; newStatus: 'Approved' | 'Rejected'; adminNotes: string }) => {
  const { error } = await supabase.rpc('process_balance_transfer', {
    p_request_id: requestId,
    p_new_status: newStatus,
    p_admin_notes: adminNotes,
  });
  if (error) throw new Error(error.message);
};

export const BalanceTransferRequestsTab = () => {
  const [status, setStatus] = useState('Pending');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const debouncedSearch = useDebounce(search, 500);
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState('');

  const { data: transfers, isLoading } = useQuery({
    queryKey: ['balanceTransfers', status, debouncedSearch, page],
    queryFn: () => fetchTransfers(status, debouncedSearch, page),
  });

  const { data: totalCount } = useQuery({
    queryKey: ['balanceTransfersCount', status, debouncedSearch],
    queryFn: () => fetchTransfersCount(status, debouncedSearch),
  });

  const mutation = useMutation({
    mutationFn: processTransfer,
    onSuccess: () => {
      toast.success("Request processed successfully.");
      queryClient.invalidateQueries({ queryKey: ['balanceTransfers'] });
      queryClient.invalidateQueries({ queryKey: ['balanceTransfersCount'] });
    },
    onError: (error) => toast.error(`Error: ${error.message}`),
  });

  const handleProcess = (requestId: string, newStatus: 'Approved' | 'Rejected') => {
    if (newStatus === 'Rejected' && !notes) {
      toast.error("Notes are required for rejection.");
      return;
    }
    mutation.mutate({ requestId, newStatus, adminNotes: notes });
  };

  const statusOptions = [
    { value: 'Pending', label: 'Pending' },
    { value: 'Approved', label: 'Approved' },
    { value: 'Rejected', label: 'Rejected' },
  ];

  return (
    <div>
      <AdminRequestFilters status={status} onStatusChange={setStatus} search={search} onSearchChange={setSearch} statusOptions={statusOptions} />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sender</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? <TableRow><TableCell colSpan={6} className="text-center"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
              : transfers?.map(req => (
                <TableRow key={req.request_id}>
                  <TableCell>{req.sender_name}</TableCell>
                  <TableCell>{req.recipient_name}</TableCell>
                  <TableCell>₹{req.amount.toLocaleString('en-IN')}</TableCell>
                  <TableCell>{format(new Date(req.requested_at), 'PPp')}</TableCell>
                  <TableCell><Badge variant={req.status === 'Approved' ? 'success' : req.status === 'Rejected' ? 'destructive' : 'default'}>{req.status}</Badge></TableCell>
                  <TableCell>
                    {req.status === 'Pending' && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild><Button size="sm">Process</Button></AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Process Transfer Request</AlertDialogTitle>
                            <AlertDialogDescription>Review the details and approve or reject this transfer.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <div className="space-y-2">
                            <p><strong>From:</strong> {req.sender_name}</p>
                            <p><strong>To:</strong> {req.recipient_name}</p>
                            <p><strong>Amount:</strong> ₹{req.amount.toLocaleString('en-IN')}</p>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="admin-notes">Admin Notes</Label>
                            <Textarea id="admin-notes" placeholder="Add notes (required for rejection)" onChange={(e) => setNotes(e.target.value)} />
                          </div>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <Button variant="destructive" onClick={() => handleProcess(req.request_id, 'Rejected')} disabled={mutation.isPending}>Reject</Button>
                            <Button variant="default" onClick={() => handleProcess(req.request_id, 'Approved')} disabled={mutation.isPending}>Approve</Button>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
      <PaginationControls currentPage={page} totalCount={totalCount || 0} onPageChange={setPage} pageSize={PAGE_SIZE} />
    </div>
  );
};