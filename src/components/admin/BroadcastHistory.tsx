import { useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { BroadcastMessage } from "@/types/database";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { usePagination, DOTS } from "@/hooks/usePagination";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 5;

const fetchBroadcastHistory = async (page: number): Promise<BroadcastMessage[]> => {
  const { data, error } = await supabase.rpc('get_broadcast_history', {
    page_limit: PAGE_SIZE,
    page_offset: (page - 1) * PAGE_SIZE,
  });
  if (error) throw new Error(error.message);
  return data;
};

const fetchBroadcastHistoryCount = async (): Promise<number> => {
  const { data, error } = await supabase.rpc('get_broadcast_history_count');
  if (error) throw new Error(error.message);
  return data;
};

export const BroadcastHistory = () => {
  const [currentPage, setCurrentPage] = useState(1);

  const { data: history, isLoading } = useQuery({
    queryKey: ['broadcastHistory', currentPage],
    queryFn: () => fetchBroadcastHistory(currentPage),
    placeholderData: keepPreviousData,
  });

  const { data: totalCount } = useQuery({
    queryKey: ['broadcastHistoryCount'],
    queryFn: fetchBroadcastHistoryCount,
  });

  const paginationRange = usePagination({
    currentPage,
    totalCount: totalCount || 0,
    pageSize: PAGE_SIZE,
  });

  const pageCount = totalCount ? Math.ceil(totalCount / PAGE_SIZE) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Broadcast History</CardTitle>
        <CardDescription>A log of all previously sent broadcast notifications.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sent By</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && !history ? (
              [...Array(3)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                </TableRow>
              ))
            ) : history && history.length > 0 ? (
              history.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="text-sm text-muted-foreground">{item.admin_email}</TableCell>
                  <TableCell>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground truncate max-w-xs">{item.description}</p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(item.created_at), "PPP")}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center">No broadcast messages have been sent yet.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {pageCount > 1 && (
          <Pagination className="mt-6">
            <PaginationContent>
              <PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); if (currentPage > 1) setCurrentPage(p => p - 1); }} className={cn(currentPage === 1 && "pointer-events-none opacity-50")} /></PaginationItem>
              {paginationRange?.map((pageNumber, index) => {
                if (pageNumber === DOTS) { return <PaginationItem key={`dots-${index}`}><PaginationEllipsis /></PaginationItem>; }
                return (<PaginationItem key={pageNumber}><PaginationLink href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(pageNumber as number); }} isActive={currentPage === pageNumber}>{pageNumber}</PaginationLink></PaginationItem>);
              })}
              <PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); if (currentPage < pageCount) setCurrentPage(p => p + 1); }} className={cn(currentPage === pageCount && "pointer-events-none opacity-50")} /></PaginationItem>
            </PaginationContent>
          </Pagination>
        )}
      </CardContent>
    </Card>
  );
};