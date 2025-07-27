import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MoreHorizontal, PlusCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AdminUserView } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { UserDetailsSheet } from "@/components/admin/UserDetailsSheet";
import { AddUserDialog } from "@/components/admin/AddUserDialog";
import { EditUserDialog } from "@/components/admin/EditUserDialog";
import { toast } from "sonner";

const fetchUsers = async (searchTerm: string): Promise<AdminUserView[]> => {
  const { data, error } = await supabase.rpc('get_all_users_details', {
    search_text: searchTerm || null
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
  const [selectedUser, setSelectedUser] = useState<AdminUserView | null>(null);
  const [userToSuspend, setUserToSuspend] = useState<AdminUserView | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isEditUserDialogOpen, setIsEditUserDialogOpen] = useState(false);
  const [isSuspendDialogOpen, setIsSuspendDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");

  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timerId);
  }, [searchTerm]);

  const { data: users, isLoading, isError, error } = useQuery<AdminUserView[]>({
    queryKey: ['allUsersDetails', debouncedSearchTerm],
    queryFn: () => fetchUsers(debouncedSearchTerm),
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

  const handleViewDetails = (user: AdminUserView) => {
    setSelectedUser(user);
    setIsSheetOpen(true);
  };

  const handleEditUser = (user: AdminUserView) => {
    setSelectedUser(user);
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

  const isUserSuspended = (user: AdminUserView) => user.banned_until && new Date(user.banned_until) > new Date();

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Search, filter, and manage client accounts.</CardDescription>
            </div>
            <Button size="sm" className="gap-1" onClick={() => setIsAddUserDialogOpen(true)}>
              <PlusCircle className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">Add User</span>
            </Button>
          </div>
          <div className="mt-4">
            <Input placeholder="Search by name or email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>KYC Status</TableHead>
                <TableHead className="text-right">Wallet Balance</TableHead>
                <TableHead><span className="sr-only">Actions</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-20" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-full" /></TableCell>
                  </TableRow>
                ))
              ) : isError ? (
                <TableRow><TableCell colSpan={6} className="text-center text-red-500">Error fetching users: {error.message}</TableCell></TableRow>
              ) : (
                users?.map((user) => (
                  <TableRow key={user.id} className={isUserSuspended(user) ? "bg-muted/50" : ""}>
                    <TableCell className="font-medium">{user.full_name || 'N/A'}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      {isUserSuspended(user) ? (
                        <Badge variant="destructive">Suspended</Badge>
                      ) : (
                        <Badge variant={user.role === 'admin' ? 'destructive' : 'outline'}>{user.role}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.kyc_status === "Approved" ? "default" : user.kyc_status === "Pending Review" ? "outline" : "secondary"}>
                        {user.kyc_status || 'Not Submitted'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      ₹{user.wallet_balance.toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button aria-haspopup="true" size="icon" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleViewDetails(user)}>View Details</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditUser(user)}>Edit User</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => handleSuspendClick(user)}>
                            {isUserSuspended(user) ? 'Unsuspend' : 'Suspend'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <UserDetailsSheet user={selectedUser} isOpen={isSheetOpen} onOpenChange={setIsSheetOpen} />
      <AddUserDialog isOpen={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen} />
      <EditUserDialog user={selectedUser} isOpen={isEditUserDialogOpen} onOpenChange={setIsEditUserDialogOpen} />
      <AlertDialog open={isSuspendDialogOpen} onOpenChange={setIsSuspendDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will {isUserSuspended(userToSuspend!) ? 'reinstate' : 'suspend'} the user account for '{userToSuspend?.full_name}'. They will {isUserSuspended(userToSuspend!) ? 'be able to' : 'not be able to'} log in.
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