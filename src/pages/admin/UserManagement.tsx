import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoreHorizontal, Download, XCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AdminUserView } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { UserDetailsSheet } from "@/components/admin/UserDetailsSheet";
import { EditUserDialog } from "@/components/admin/EditUserDialog";
import { toast } from "sonner";
import { exportToCsv } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDebounce } from "@/hooks/useDebounce";

const fetchUsers = async (searchTerm: string, kycStatus: string, accountStatus: string): Promise<AdminUserView[]> => {
  const { data, error } = await supabase.rpc('get_all_users_details', {
    search_text: searchTerm || null,
    kyc_status_filter: kycStatus === 'all' ? null : kycStatus,
    account_status_filter: accountStatus === 'all' ? null : accountStatus,
  });
  if (error) {
    throw new Error(error.message);
  }
  return data;
};

const suspendUser = async ({ userId, suspend }: { userId: string; suspend: boolean }) => {
  const { data, error } = await supabase.functions.invoke('admin-suspend-user', {
    body: { userId, suspend },
  });
  if (error) throw new Error(error.message);
  if (data.error) throw new Error(data.error);
  return data;
};

const UserManagement = () => {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<AdminUserView | null>(null);
  const [selectedUserIdForSheet, setSelectedUserIdForSheet] = useState<string | null>(null);
  const [userToSuspend, setUserToSuspend] = useState<AdminUserView | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [kycStatusFilter, setKycStatusFilter] = useState("all");
  const [accountStatusFilter, setAccountStatusFilter] = useState("all");

  const { data: users, isLoading, isError, error } = useQuery<AdminUserView[]>({
    queryKey: ['allUsersDetails', debouncedSearchTerm, kycStatusFilter, accountStatusFilter],
    queryFn: () => fetchUsers(debouncedSearchTerm, kycStatusFilter, accountStatusFilter),
  });

  const suspendMutation = useMutation({
    mutationFn: suspendUser,
    onSuccess: (_, variables) => {
      toast.success(`User has been ${variables.suspend ? 'suspended' : 'unsuspended'}.`);
      queryClient.invalidateQueries({ queryKey: ['allUsersDetails'] });
    },
    onError: (error) => {
      toast.error(`Action failed: ${error.message}`);
    },
    onSettled: () => {
      setIsSuspendDialogOpen(false);
      setUserToSuspend(null);
    },
  });

  const handleViewDetails = (userId: string) => {
    setSelectedUserIdForSheet(userId);
    setIsSheetOpen(true);
  };

  const handleEditUser = (user: AdminUserView) => {
    setSelectedUserForEdit(user);
    setIsEditUserDialogOpen(true);
  };

  const handleSuspendClick = (user: AdminUserView) => {
    setUserToSuspend(user);
    setIsSuspendDialogOpen(true);
  };

  const handleConfirmSuspend = () => {
    if (!userToSuspend) return;
    const isCurrentlySuspended = userToSuspend.banned_until && new Date(userToSuspend.banned_until) > new Date();
    suspendMutation.mutate({ userId: userToSuspend.id, suspend: !isCurrentlySuspended });
  };

  const isUserSuspended = (user: AdminUserView | null) => user && user.banned_until && new Date(user.banned_until) > new Date();

  const handleExport = () => {
    if (!users || users.length === 0) {
      toast.warning("No user data to export.");
      return;
    }
    const dataToExport = users.map(user => ({
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
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setKycStatusFilter("all");
    setAccountStatusFilter("all");
  };

  const areFiltersActive = searchTerm !== "" || kycStatusFilter !== "all" || accountStatusFilter !== "all";

  const renderDesktopView = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>KYC Status</TableHead>
          <TableHead>Last Login</TableHead>
          <TableHead className="text-right">Wallet Balance</TableHead>
          <TableHead><span className="sr-only">Actions</span></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <TableRow key={i}><TableCell><Skeleton className="h-5 w-24" /></TableCell><TableCell><Skeleton className="h-6 w-16" /></TableCell><TableCell><Skeleton className="h-6 w-20" /></TableCell><TableCell><Skeleton className="h-5 w-24" /></TableCell><TableCell className="text-right"><Skeleton className="h-5 w-20" /></TableCell><TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell></TableRow>
          ))
        ) : isError ? (
          <TableRow><TableCell colSpan={6} className="text-center text-red-500">Error fetching users: {error.message}</TableCell></TableRow>
        ) : (
          users?.map((user) => (
            <TableRow key={user.id} className={isUserSuspended(user) ? "bg-muted/50" : ""}>
              <TableCell className="font-medium"><div>{user.full_name || 'N/A'}</div><div className="text-xs text-muted-foreground">{user.email}</div></TableCell>
              <TableCell>{isUserSuspended(user) ? (<Badge variant="destructive">Suspended</Badge>) : (<Badge variant={user.role === 'admin' ? 'destructive' : 'outline'}>{user.role}</Badge>)}</TableCell>
              <TableCell><Badge variant={user.kyc_status === "Approved" ? "default" : user.kyc_status === "Pending Review" ? "outline" : "secondary"}>{user.kyc_status || 'Not Submitted'}</Badge></TableCell>
              <TableCell className="text-sm text-muted-foreground">{user.last_sign_in_at ? formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true }) : 'Never'}</TableCell>
              <TableCell className="text-right font-mono">₹{user.wallet_balance.toLocaleString('en-IN')}</TableCell>
              <TableCell>
                <DropdownMenu><DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Actions</DropdownMenuLabel><DropdownMenuItem onClick={() => handleViewDetails(user.id)}>View Details</DropdownMenuItem><DropdownMenuItem onClick={() => handleEditUser(user)}>Edit User</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-red-600" onClick={() => handleSuspendClick(user)}>{isUserSuspended(user) ? 'Unsuspend' : 'Suspend'}</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  const renderMobileView = () => (
    <div className="space-y-4">
      {isLoading ? (
        [...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)
      ) : isError ? (
        <div className="text-center text-red-500">Error fetching users: {error.message}</div>
      ) : (
        users?.map((user) => (
          <Card key={user.id} className={isUserSuspended(user) ? "bg-muted/50" : ""}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{user.full_name || 'N/A'}</CardTitle>
                  <CardDescription>{user.email}</CardDescription>
                </div>
                <DropdownMenu><DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuLabel>Actions</DropdownMenuLabel><DropdownMenuItem onClick={() => handleViewDetails(user.id)}>View Details</DropdownMenuItem><DropdownMenuItem onClick={() => handleEditUser(user)}>Edit User</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-red-600" onClick={() => handleSuspendClick(user)}>{isUserSuspended(user) ? 'Unsuspend' : 'Suspend'}</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Status</span>{isUserSuspended(user) ? (<Badge variant="destructive">Suspended</Badge>) : (<Badge variant={user.role === 'admin' ? 'destructive' : 'outline'}>{user.role}</Badge>)}</div>
              <div className="flex justify-between"><span className="text-muted-foreground">KYC</span><Badge variant={user.kyc_status === "Approved" ? "default" : user.kyc_status === "Pending Review" ? "outline" : "secondary"}>{user.kyc_status || 'Not Submitted'}</Badge></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Last Login</span><span>{user.last_sign_in_at ? formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true }) : 'Never'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Wallet</span><span className="font-mono">₹{user.wallet_balance.toLocaleString('en-IN')}</span></div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Search, filter, and manage client accounts.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="gap-1" onClick={handleExport}>
                <Download className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Export</span>
              </Button>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-4 md:flex-row">
            <Input placeholder="Search by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex-grow" />
            <div className="flex gap-4">
              <Select value={kycStatusFilter} onValueChange={setKycStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter by KYC" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All KYC Statuses</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Pending Review">Pending Review</SelectItem>
                  <SelectItem value="Not Submitted">Not Submitted</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={accountStatusFilter} onValueChange={setAccountStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Account Statuses</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
              {areFiltersActive && (
                <Button variant="ghost" onClick={handleClearFilters}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isMobile ? renderMobileView() : renderDesktopView()}
        </CardContent>
      </Card>
      <UserDetailsSheet userId={selectedUserIdForSheet} isOpen={isSheetOpen} onOpenChange={setIsSheetOpen} />
      <EditUserDialog user={selectedUserForEdit} isOpen={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen} />
      <AlertDialog open={isSuspendDialogOpen} onOpenChange={setIsSuspendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will {isUserSuspended(userToSuspend) ? 'reinstate' : 'suspend'} the user account for '{userToSuspend?.full_name}'. They will {isUserSuspended(userToSuspend) ? 'be able to' : 'not be able to'} log in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSuspend} disabled={suspendMutation.isPending}>
              {suspendMutation.isPending ? "Processing..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default UserManagement;