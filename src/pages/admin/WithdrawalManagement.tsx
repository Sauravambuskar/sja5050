"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { AdminWithdrawalRequest } from '@/types/database';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { ProcessWithdrawalDialog } from '@/components/admin/ProcessWithdrawalDialog';
import { useDebounce } from '@/hooks/useDebounce';

const ITEMS_PER_PAGE = 10;

const WithdrawalManagement = () => {
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 500);
  const [selectedRequest, setSelectedRequest] = useState<AdminWithdrawalRequest | null>(null);

  const { data, isLoading, error, refetch } = useQuery<AdminWithdrawalRequest[]>({
    queryKey: ['adminWithdrawalRequests', page, statusFilter, debouncedSearchQuery],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_withdrawal_requests', {
        p_limit: ITEMS_PER_PAGE,
        p_offset: page * ITEMS_PER_PAGE,
        p_status_filter: statusFilter === 'All' ? null : statusFilter,
        p_search_text: debouncedSearchQuery,
      });
      if (error) throw error;
      return data;
    },
  });

  const { data: totalCountData } = useQuery<number>({
    queryKey: ['adminWithdrawalRequestsCount', statusFilter, debouncedSearchQuery],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_all_withdrawal_requests_count', {
        p_status_filter: statusFilter === 'All' ? null : statusFilter,
        p_search_text: debouncedSearchQuery,
      });
      if (error) throw error;
      return data;
    },
  });

  const totalPages = totalCountData ? Math.ceil(totalCountData / ITEMS_PER_PAGE) : 0;

  const handleProcessRequest = (request: AdminWithdrawalRequest) => {
    setSelectedRequest(request);
  };

  return (
    <div className="p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Withdrawal Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <Input
              placeholder="Search by user name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
            <Select
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(0); // Reset page when filter changes
              }}
              value={statusFilter || 'All'}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
                <SelectItem value="Failed">Failed</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => refetch()}>Refresh</Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="text-red-500">Error: {error.message}</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Requested At</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Wallet Balance</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center">
                        No withdrawal requests found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data?.map((request) => (
                      <TableRow key={request.request_id}>
                        <TableCell>{request.user_name || 'N/A'}</TableCell>
                        <TableCell>{request.user_email || 'N/A'}</TableCell>
                        <TableCell>₹{request.amount.toFixed(2)}</TableCell>
                        <TableCell>{format(new Date(request.requested_at), 'PPP p')}</TableCell>
                        <TableCell>{request.status}</TableCell>
                        <TableCell>₹{request.wallet_balance.toFixed(2)}</TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleProcessRequest(request)}
                            disabled={request.status !== 'Pending'}
                          >
                            Process
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <Pagination className="mt-4">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => setPage((prev) => Math.max(0, prev - 1))}
                      className={page === 0 ? 'pointer-events-none opacity-50' : undefined}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    Page {page + 1} of {totalPages}
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
                      className={page >= totalPages - 1 ? 'pointer-events-none opacity-50' : undefined}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </>
          )}
        </CardContent>
      </Card>
      <ProcessWithdrawalDialog
        isOpen={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        request={selectedRequest}
      />
    </div>
  );
};

export default WithdrawalManagement;