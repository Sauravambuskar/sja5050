"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client'; // Corrected import
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle, XCircle, Eye } from 'lucide-react';
import { AdminDepositRequest } from '@/types/database';

export default function AdminDepositsPage() {
  const [requests, setRequests] = useState<AdminDepositRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<AdminDepositRequest | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [notes, setNotes] = useState('');
  const [actionType, setActionType] = useState<'Approve' | 'Reject' | null>(null);

  const fetchDepositRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error } = await supabase.rpc('get_all_deposit_requests');

    if (error) {
      setError('Failed to fetch deposit requests. ' + error.message);
      toast.error('Failed to fetch deposit requests.');
    } else {
      setRequests(data as AdminDepositRequest[]);
    }
    setLoading(false);
  }, []); // Removed supabase from dependency array as it's stable

  useEffect(() => {
    fetchDepositRequests();
  }, [fetchDepositRequests]);

  const openDialog = (request: AdminDepositRequest, type: 'Approve' | 'Reject') => {
    setSelectedRequest(request);
    setActionType(type);
    setNotes(request.admin_notes || '');
  };

  const handleProcessRequest = async () => {
    if (!selectedRequest || !actionType) return;

    setIsProcessing(true);
    const newStatus = actionType === 'Approve' ? 'Approved' : 'Rejected';

    const { error } = await supabase.rpc('process_deposit_request', {
      request_id_to_process: selectedRequest.request_id,
      new_status: newStatus,
      notes: notes,
    });

    if (error) {
      toast.error(`Failed to ${actionType.toLowerCase()} request: ${error.message}`);
    } else {
      toast.success(`Request has been ${newStatus.toLowerCase()}.`);
      setSelectedRequest(null);
      setActionType(null);
      setNotes('');
      fetchDepositRequests(); // Refresh the list
    }
    setIsProcessing(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'Approved':
        return <Badge variant="success">Approved</Badge>;
      case 'Rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Manage Deposit Requests</CardTitle>
          <CardDescription>Review and process all user deposit requests.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Reference ID</TableHead>
                <TableHead>Requested At</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length > 0 ? (
                requests.map((req) => (
                  <TableRow key={req.request_id}>
                    <TableCell>
                      <div className="font-medium">{req.user_name || 'N/A'}</div>
                      <div className="text-sm text-muted-foreground">{req.user_email || 'No email'}</div>
                    </TableCell>
                    <TableCell>₹{Number(req.amount).toLocaleString('en-IN')}</TableCell>
                    <TableCell>{req.reference_id}</TableCell>
                    <TableCell>{new Date(req.requested_at).toLocaleString()}</TableCell>
                    <TableCell>{getStatusBadge(req.status)}</TableCell>
                    <TableCell>
                      {req.status === 'Pending' ? (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openDialog(req, 'Approve')}>
                            <CheckCircle className="h-4 w-4 mr-2" /> Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => openDialog(req, 'Reject')}>
                            <XCircle className="h-4 w-4 mr-2" /> Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Processed</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center">No deposit requests found.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedRequest} onOpenChange={(isOpen) => !isOpen && setSelectedRequest(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{actionType} Deposit Request</DialogTitle>
            <DialogDescription>
              You are about to {actionType?.toLowerCase()} a deposit of ₹{Number(selectedRequest?.amount).toLocaleString('en-IN')} for {selectedRequest?.user_name || 'this user'}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {selectedRequest?.screenshot_path && (
              <a href={selectedRequest.screenshot_path} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                <Eye className="h-4 w-4" /> View Payment Screenshot
              </a>
            )}
            <Textarea
              placeholder="Add notes for this action (optional for approval, required for rejection)."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={isProcessing}
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" disabled={isProcessing}>Cancel</Button>
            </DialogClose>
            <Button onClick={handleProcessRequest} disabled={isProcessing || (actionType === 'Reject' && !notes.trim())}>
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : `Confirm ${actionType}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}