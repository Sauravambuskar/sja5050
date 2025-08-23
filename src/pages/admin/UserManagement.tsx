import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoreHorizontal, Download, XCircle, Loader2, PlusCircle, LogIn, FileText } from "lucide-react";
import { useQuery, useMutation, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AdminUserView } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { EditUserDialog } from "@/components/admin/EditUserDialog";
import { toast } from "sonner";
import { exportToCsv } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDebounce } from "@/hooks/useDebounce";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { usePagination, DOTS } from "@/hooks/usePagination";
import { cn } from "@/lib/utils";
import { AddUserDialog } from "@/components/admin/AddUserDialog";
import { useOutletContext, useNavigate } from "react-router-dom";
import { PageLayoutContext } from "@/components/layout/PageLayout";
import { useAuth } from "@/components/auth/AuthProvider";

const PAGE_SIZE = 20;

const fetchUsers = async (searchTerm: string, kycStatus: string, accountStatus: string, page: number): Promise<AdminUserView[]> => {
  const { data, error } = await supabase.rpc('get_all_users_details', {
    search_text: searchTerm || null,
    kyc_status_filter: kycStatus === 'all' ? null : kycStatus,
    account_status_filter: accountStatus === 'all' ? null : accountStatus,
    page_limit: PAGE_SIZE,
    page_offset: (page - 1) * PAGE_SIZE,
  });
  if (error) throw new Error(error.message);
  return data;
};

const fetchUsersCount = async (searchTerm: string, kycStatus: string, accountStatus: string): Promise<number> => {
  const { data, error } = await supabase.rpc('get_all_users_details_count', {
    search_text: searchTerm || null,
    kyc_status_filter: kycStatus === 'all' ? null : kycStatus,
    account_status_filter: accountStatus === 'all' ? null : accountStatus,
  });
  if (error) throw new Error(error.message);
  return data;
};

const suspendUser = async ({ userId, suspend }: { userId: string; suspend: boolean }) => {
  const { data, error } = await supabase.functions.invoke('admin-suspend-user', { body: { userId, suspend } });
  if (error) throw new Error(error.message);
  if (data.error) throw new Error(data.error);
  return data;
};

const UserManagement = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { handleViewUser } = useOutletContext<PageLayoutContext>();
  const { impersonateUser } = useAuth();
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<AdminUserView | null>(null);
  const [userToSuspend, setUserToSuspend] = useState<AdminUserView | null>(null);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [kycStatusFilter, setKycStatusFilter] = useState("all");
  const [accountStatusFilter, setAccountStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  const { data: users, isLoading, isError, error } = useQuery<AdminUserView[]>({
    queryKey: ['allUsersDetails', debouncedSearchTerm, kycStatusFilter, accountStatusFilter, currentPage],
    queryFn: () => fetchUsers(debouncedSearchTerm, kycStatusFilter, accountStatusFilter, currentPage),
    placeholderData: keepPreviousData,
  });

  const { data: totalUsers } = useQuery<number>({
    queryKey: ['allUsersDetailsCount', debouncedSearchTerm, kycStatusFilter, accountStatusFilter],
    queryFn: () => fetchUsersCount(debouncedSearchTerm, kycStatusFilter, accountStatusFilter),
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm, kycStatusFilter, accountStatusFilter]);

  const paginationRange = usePagination({ currentPage, totalCount: totalUsers || 0, pageSize: PAGE_SIZE });
  const pageCount = totalUsers ? Math.ceil(totalUsers / PAGE_SIZE) : 0;

  const suspendMutation = useMutation({
    mutationFn: suspendUser,
    onSuccess: (_, variables) => {
      toast.success(`User has been ${variables.suspend ? 'suspended' : 'unsuspended'}.`);
      queryClient.invalidateQueries({ queryKey: ['allUsersDetails'] });
    },
    onError: (error) => { toast.error(`Action failed: ${error.message}`); },
    onSettled: () => { setIsSuspendDialogOpen(false); setUserToSuspend(null); },
  });

  const handleEditUser = (user: AdminUserView) => { setSelectedUserForEdit(user); setIsEditUserDialogOpen(true); };
  const handleSuspendClick = (user: AdminUserView) => { setUserToSuspend(user); setIsSuspendDialogOpen(true); };
  const handleConfirmSuspend = () => { if (!userToSuspend) return; const isCurrentlySuspended = userToSuspend.banned_until && new Date(userToSuspend.banned_until) > new Date(); suspendMutation.mutate({ userId: userToSuspend.id, suspend: !isCurrentlySuspended }); };
  const isUserSuspended = (user: AdminUserView | null) => user && user.banned_until && new Date(user.banned_until) > new Date();

  const handleExport = async () => {
    setIsExporting(true);
    toast.info("Preparing user data for export...");

    try {
      const { data: usersToExport, error: exportError } = await supabase.rpc('export_all_users_details', {
        search_text: debouncedSearchTerm || null,
        kyc_status_filter: kycStatusFilter === 'all' ? null : kycStatusFilter,
        account_status_filter: accountStatusFilter === 'all' ? null : accountStatusFilter,
      });

      if (exportError) throw exportError;

      if (!usersToExport || usersToExport.length === 0) {
        toast.warning("No user data found for the current filters.");
        return;
      }

      const dataToExport = usersToExport.map((user: AdminUserView) => ({
        UserID: user.id,
        FullName: user.full_name,
        Email: user.email,
        JoinDate: format(new Date(user.join_date), 'yyyy-MM-dd'),
        LastLogin: user.last_sign_in_at ? format(new Date(user.last_sign_in_at), 'yyyy-MM-dd HH:mm') : 'Never',
        KYCStatus: user.kyc_status,
        WalletBalance: user.wallet_balance,
        Role: user.role,
        IsSuspended: isUserSuspended(user) ? 'Yes' : 'No',
      }));

      const filename = `users_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      exportToCsv(filename, dataToExport);
      toast.success("User data exported successfully.");

    } catch (error: any) {
      toast.error(`Export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearFilters = () => { setSearchTerm(""); setKycStatusFilter("all"); setAccountStatusFilter("all"); };
  const areFiltersActive = searchTerm !== "" || kycStatusFilter !== "all" || accountStatusFilter !== "all";

  const renderPagination = () => (
    pageCount > 1 && (
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
    )
  );

  const renderDesktopView = () => (
    <Table>
      <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Status</TableHead><TableHead>KYC Status</TableHead><TableHead>Last Login</TableHead><TableHead className="text-right">Wallet Balance</TableHead><TableHead><span className="sr-only">Actions</span></TableHead></TableRow></TableHeader>
      <TableBody>
        {isLoading && !users ? ([...Array(5)].map((_, i) => (<TableRow key={i}><TableCell><Skeleton className="h-5 w-24" /></TableCell><TableCell><Skeleton className="h-6 w-16" /></TableCell><TableCell><Skeleton className="h-6 w-20" /></TableCell><TableCell><Skeleton className="h-5 w-24" /></TableCell><TableCell className="text-right"><Skeleton className="h-5 w-20" /></TableCell><TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell></TableRow>))) : isError ? (<TableRow><TableCell colSpan={6} className="text-center text-red-500">Error fetching users: {error.message}</TableCell></TableRow>) : (users?.map((user) => (<TableRow key={user.id} className={isUserSuspended(user) ? "bg-muted/50" : ""}><TableCell className="font-medium"><div>{user.full_name || 'N/A'}</div><div className="text-xs text-muted-foreground">{user.email}</div></TableCell><TableCell>{isUserSuspended(user) ? (<Badge variant="destructive">Suspended</Badge>) : (<Badge variant={user.role === 'admin' ? 'destructive' : 'outline'}>{user.role}</Badge>)}</TableCell><TableCell><Badge variant={user.kyc_status === "Approved" ? "default" : user.kyc_status === "Pending Review" ? "outline" : "secondary"}>{user.kyc_status || 'Not Submitted'}</Badge></TableCell><TableCell className="text-sm text-muted-foreground">{user.last_sign_in_at ? formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true }) : 'Never'}</TableCell><TableCell className="text-right font-mono">₹{user.wallet_balance.toLocaleString('en-IN')}</TableCell><TableCell><DropdownMenu><DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Actions</DropdownMenuLabel><DropdownMenuItem onClick={() => handleViewUser(user.id)}>View Details</DropdownMenuItem><DropdownMenuItem onClick={() => navigate(`/admin/users/${user.id}/payment-details`)}><FileText className="mr-2 h-4 w-4" />Payment Details</DropdownMenuItem><DropdownMenuItem onClick={() => handleEditUser(user)}>Edit User</DropdownMenuItem><DropdownMenuItem onClick={() => impersonateUser(user.id)}><LogIn className="mr-2 h-4 w-4" />Login as User</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-red-600" onClick={() => handleSuspendClick(user)}>{isUserSuspended(user) ? 'Unsuspend' : 'Suspend'}</DropdownMenuItem></DropdownMenuContent></DropdownMenu></TableCell></TableRow>)))}
      </TableBody>
    </Table>
  );

  const renderMobileView = () => (
    <div className="space-y-4">
      {isLoading && !users ? ([...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)) : isError ? (<div className="text-center text-red-500">Error fetching users: {error.message}</div>) : (users?.map((user) => (<Card key={user.id} className={isUserSuspended(user) ? "bg-muted/50" : ""}><CardHeader><div className="flex items-start justify-between"><div><CardTitle>{user.full_name || 'N/A'}</CardTitle><CardDescription>{user.email}</CardDescription></div><DropdownMenu><DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Actions</DropdownMenuLabel><DropdownMenuItem onClick={() => handleViewUser(user.id)}>View Details</DropdownMenuItem><DropdownMenuItem onClick={() => navigate(`/admin/users/${user.id}/payment-details`)}><FileText className="mr-2 h-4 w-4" />Payment Details</DropdownMenuItem><DropdownMenuItem onClick={() => handleEditUser(user)}>Edit User</DropdownMenuItem><DropdownMenuItem onClick={() => impersonateUser(user.id)}><LogIn className="mr-2 h-4 w-4" />Login as User</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-red-600" onClick={() => handleSuspendClick(user)}>{isUserSuspended(user) ? 'Unsuspend' : 'Suspend'}</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></CardHeader><CardContent className="space-y-3 text-sm"><div className="flex justify-between"><span className="text-muted-foreground">Status</span>{isUserSuspended(user) ? (<Badge variant="destructive">Suspended</Badge>) : (<Badge variant={user.role === 'admin' ? 'destructive' : 'outline'}>{user.role}</Badge>)}</div><div className="flex justify-between"><span className="text-muted-foreground">KYC</span><Badge variant={user.kyc_status === "Approved" ? "default" : user.kyc_status === "Pending Review" ? "outline" : "secondary"}>{user.kyc_status || 'Not Submitted'}</Badge></div><div className="flex justify-between"><span className="text-muted-foreground">Last Login</span><span>{user.last_sign_in_at ? formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true }) : 'Never'}</span></div><div className="flex justify-between"><span className="text-muted-foreground">Wallet</span><span className="font-mono">₹{user.wallet_balance.toLocaleString('en-IN')}</span></div></CardContent></Card>)))}
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div><CardTitle>User Management</CardTitle><CardDescription>Search, filter, and manage client accounts.</CardDescription></div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="gap-1" onClick={handleExport} disabled={isExporting}>
                {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  {isExporting ? "Exporting..." : "Export"}
                </span>
              </Button>
              <Button size="sm" className="gap-1" onClick={() => setIsAddUserDialogOpen(true)}>
                <PlusCircle className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  Add User
                </span>
              </Button>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-4 md:flex-row">
            <Input placeholder="Search by name, email, or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-grow" />
            <div className="flex gap-4">
              <Select value={kycStatusFilter} onValueChange={setKycStatusFilter}><SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Filter by KYC" /></SelectTrigger><SelectContent><SelectItem value="all">All KYC Statuses</SelectItem><SelectItem value="Approved">Approved</SelectItem><SelectItem value="Pending Review">Pending Review</SelectItem><SelectItem value="Not Submitted">Not Submitted</SelectItem><SelectItem value="Rejected">Rejected</SelectItem></SelectContent></Select>
              <Select value={accountStatusFilter} onValueChange={setAccountStatusFilter}><SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Filter by Status" /></SelectTrigger><SelectContent><SelectItem value="all">All Account Statuses</SelectItem><SelectItem value="Active">Active</SelectItem><SelectItem value="Suspended">Suspended</SelectItem></SelectContent></Select>
              {areFiltersActive && (<Button variant="ghost" onClick={handleClearFilters}><XCircle className="mr-2 h-4 w-4" />Clear</Button>)}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isMobile ? renderMobileView() : renderDesktopView()}
          {renderPagination()}
        </CardContent>
      </Card>
      <EditUserDialog user={selectedUserForEdit} isOpen={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen} />
      <AddUserDialog isOpen={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen} />
      <AlertDialog open={isSuspendDialogOpen} onOpenChange={setIsSuspendDialogOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This action will {isUserSuspended(userToSuspend) ? 'reinstate' : 'suspend'} the user account for '{userToSuspend?.full_name}'. They will {isUserSuspended(userToSuspend) ? 'be able to' : 'not be able to'} log in.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleConfirmSuspend} disabled={suspendMutation.isPending}>{suspendMutation.isPending ? "Processing..." : "Confirm"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </>
  );
};

export default UserManagement;