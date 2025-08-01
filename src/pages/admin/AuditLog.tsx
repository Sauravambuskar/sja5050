import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, XCircle } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination, DOTS } from "@/hooks/usePagination";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 20;

type AuditLog = {
  id: string;
  admin_email: string;
  action: string;
  target_user_id: string;
  details: any;
  created_at: string;
};

const fetchAuditLogs = async (filters: any): Promise<AuditLog[]> => {
  const { data, error } = await supabase.rpc('get_admin_audit_log', {
    p_admin_email: filters.adminEmail || null,
    p_action: filters.action || null,
    p_search_text: filters.searchText || null,
    p_start_date: filters.startDate ? format(filters.startDate, 'yyyy-MM-dd') : null,
    p_end_date: filters.endDate ? format(filters.endDate, 'yyyy-MM-dd') : null,
    p_limit: PAGE_SIZE,
    p_offset: (filters.page - 1) * PAGE_SIZE,
  });
  if (error) throw new Error(error.message);
  return data;
};

const fetchAuditLogsCount = async (filters: any): Promise<number> => {
  const { data, error } = await supabase.rpc('get_admin_audit_log_count', {
    p_admin_email: filters.adminEmail || null,
    p_action: filters.action || null,
    p_search_text: filters.searchText || null,
    p_start_date: filters.startDate ? format(filters.startDate, 'yyyy-MM-dd') : null,
    p_end_date: filters.endDate ? format(filters.endDate, 'yyyy-MM-dd') : null,
  });
  if (error) throw new Error(error.message);
  return data;
};

const fetchDistinctAdmins = async () => {
  const { data, error } = await supabase.rpc('get_distinct_audit_log_admins');
  if (error) throw new Error(error.message);
  return data.map((item: { admin_email: string }) => item.admin_email);
};

const fetchDistinctActions = async () => {
  const { data, error } = await supabase.rpc('get_distinct_audit_log_actions');
  if (error) throw new Error(error.message);
  return data.map((item: { action: string }) => item.action);
};

const AuditLog = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState("");
  const [selectedAdmin, setSelectedAdmin] = useState("");
  const [selectedAction, setSelectedAction] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const debouncedSearchText = useDebounce(searchText, 500);

  const filters = {
    page: currentPage,
    searchText: debouncedSearchText,
    adminEmail: selectedAdmin,
    action: selectedAction,
    startDate,
    endDate,
  };

  const { data: logs, isLoading: isLogsLoading } = useQuery({
    queryKey: ['adminAuditLog', filters],
    queryFn: () => fetchAuditLogs(filters),
    placeholderData: keepPreviousData,
  });

  const { data: totalLogs } = useQuery({
    queryKey: ['adminAuditLogCount', filters],
    queryFn: () => fetchAuditLogsCount(filters),
  });

  const { data: distinctAdmins } = useQuery({ queryKey: ['distinctAdmins'], queryFn: fetchDistinctAdmins });
  const { data: distinctActions } = useQuery({ queryKey: ['distinctActions'], queryFn: fetchDistinctActions });

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchText, selectedAdmin, selectedAction, startDate, endDate]);

  const paginationRange = usePagination({ currentPage, totalCount: totalLogs || 0, pageSize: PAGE_SIZE });
  const pageCount = totalLogs ? Math.ceil(totalLogs / PAGE_SIZE) : 0;

  const formatAction = (action: string) => action.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const areFiltersActive = searchText || selectedAdmin || selectedAction || startDate || endDate;
  const handleClearFilters = () => { setSearchText(""); setSelectedAdmin(""); setSelectedAction(""); setStartDate(undefined); setEndDate(undefined); };

  return (
    <>
      <h1 className="text-3xl font-bold">Admin Audit Log</h1>
      <p className="text-muted-foreground">A record of all administrative actions taken on the platform.</p>
      
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Filter & Search Logs</CardTitle>
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Input placeholder="Search by Target User ID..." value={searchText} onChange={(e) => setSearchText(e.target.value)} />
            <Select value={selectedAdmin} onValueChange={setSelectedAdmin}><SelectTrigger><SelectValue placeholder="Filter by Admin" /></SelectTrigger><SelectContent>{distinctAdmins?.map(email => <SelectItem key={email} value={email}>{email}</SelectItem>)}</SelectContent></Select>
            <Select value={selectedAction} onValueChange={setSelectedAction}><SelectTrigger><SelectValue placeholder="Filter by Action" /></SelectTrigger><SelectContent>{distinctActions?.map(action => <SelectItem key={action} value={action}>{formatAction(action)}</SelectItem>)}</SelectContent></Select>
            <div className="flex gap-2">
              <Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !startDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{startDate ? format(startDate, "PPP") : <span>Start Date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={setStartDate} /></PopoverContent></Popover>
              <Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !endDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{endDate ? format(endDate, "PPP") : <span>End Date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={setEndDate} /></PopoverContent></Popover>
            </div>
          </div>
          {areFiltersActive && <Button variant="ghost" size="sm" onClick={handleClearFilters} className="mt-2"><XCircle className="mr-2 h-4 w-4" />Clear Filters</Button>}
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Timestamp</TableHead><TableHead>Admin</TableHead><TableHead>Action</TableHead><TableHead>Details</TableHead></TableRow></TableHeader>
            <TableBody>
              {isLogsLoading ? ([...Array(5)].map((_, i) => (<TableRow key={i}><TableCell><Skeleton className="h-5 w-32" /></TableCell><TableCell><Skeleton className="h-5 w-40" /></TableCell><TableCell><Skeleton className="h-6 w-24" /></TableCell><TableCell><Skeleton className="h-5 w-full" /></TableCell></TableRow>))) : (logs?.map((log) => (<TableRow key={log.id}><TableCell className="text-sm text-muted-foreground">{format(new Date(log.created_at), "PPP p")}</TableCell><TableCell>{log.admin_email}</TableCell><TableCell><Badge variant="secondary">{formatAction(log.action)}</Badge></TableCell><TableCell className="text-sm font-mono">{JSON.stringify(log.details)}</TableCell></TableRow>)))}
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
    </>
  );
};

export default AuditLog;