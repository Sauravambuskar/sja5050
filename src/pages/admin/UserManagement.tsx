"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AdminUserView } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MoreHorizontal, PlusCircle, FileText, Search, Trash2 } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { DataTable } from "@/components/ui/data-table";
import { columns } from "@/components/admin/user-management/columns";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { AddUserDialog } from "@/components/admin/AddUserDialog";
import { EditUserDialog } from "@/components/admin/EditUserDialog";
import { UserDetailsSheet } from "@/components/admin/UserDetailsSheet";
import { useSearchParams, useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PAGE_SIZE = 20;

type SortValue =
  | "newest"
  | "oldest"
  | "name_asc"
  | "name_desc"
  | "email_asc"
  | "email_desc";

function parseSort(sort: SortValue) {
  switch (sort) {
    case "oldest":
      return { sort_by: "join_date", sort_dir: "asc" };
    case "name_asc":
      return { sort_by: "full_name", sort_dir: "asc" };
    case "name_desc":
      return { sort_by: "full_name", sort_dir: "desc" };
    case "email_asc":
      return { sort_by: "email", sort_dir: "asc" };
    case "email_desc":
      return { sort_by: "email", sort_dir: "desc" };
    case "newest":
    default:
      return { sort_by: "join_date", sort_dir: "desc" };
  }
}

const fetchUsers = async (
  page: number,
  searchTerm: string,
  kycStatus: string,
  accountStatus: string,
  sort: SortValue
) => {
  const { sort_by, sort_dir } = parseSort(sort);

  const { data, error, count } = await supabase
    .rpc(
      "get_all_users_details",
      {
        search_text: searchTerm || null,
        kyc_status_filter: kycStatus || null,
        account_status_filter: accountStatus || null,
        page_limit: PAGE_SIZE,
        page_offset: (page - 1) * PAGE_SIZE,
        sort_by,
        sort_dir,
      },
      { count: "exact" }
    );

  if (error) {
    throw new Error(error.message);
  }

  return { users: data as AdminUserView[], count: count ?? 0 };
};

const UserManagement = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const page = parseInt(searchParams.get("page") || "1", 10);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [kycStatus, setKycStatus] = useState(searchParams.get("kyc_status") || "all");
  const [accountStatus, setAccountStatus] = useState(searchParams.get("account_status") || "all");
  const [sort, setSort] = useState<SortValue>((searchParams.get("sort") as SortValue) || "newest");

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUserView | null>(null);
  const [userToSuspend, setUserToSuspend] = useState<AdminUserView | null>(null);
  const [userToDelete, setUserToDelete] = useState<AdminUserView | null>(null);

  const sheetUserId = searchParams.get("user");
  const isSheetOpen = !!sheetUserId;

  const { data: queryData, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["adminUsers", page, debouncedSearchTerm, kycStatus, accountStatus, sort],
    queryFn: () =>
      fetchUsers(
        page,
        debouncedSearchTerm,
        kycStatus === "all" ? "" : kycStatus,
        accountStatus === "all" ? "" : accountStatus,
        sort
      ),
    placeholderData: keepPreviousData,
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const { users = [], count = 0 } = queryData || {};
  const totalPages = Math.ceil(count / PAGE_SIZE);

  const updateSearchParams = (newParams: Record<string, string>) => {
    const currentParams = new URLSearchParams(searchParams);
    Object.entries(newParams).forEach(([key, value]) => {
      if (value) {
        currentParams.set(key, value);
      } else {
        currentParams.delete(key);
      }
    });
    setSearchParams(currentParams);
  };

  const handlePageChange = (newPage: number) => {
    updateSearchParams({ page: newPage.toString() });
  };

  const handleFilterChange = (filter: "kyc_status" | "account_status", value: string) => {
    if (filter === "kyc_status") setKycStatus(value);
    if (filter === "account_status") setAccountStatus(value);
    updateSearchParams({ [filter]: value === "all" ? "" : value, page: "1" });
  };

  const handleSortChange = (value: SortValue) => {
    setSort(value);
    updateSearchParams({ sort: value === "newest" ? "" : value, page: "1" });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    updateSearchParams({ search: e.target.value, page: "1" });
  };

  const handleViewUser = (userId: string) => {
    updateSearchParams({ user: userId });
  };

  const handleSheetOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      updateSearchParams({ user: "" });
    }
  };

  const handleEditUser = (user: AdminUserView) => {
    setSelectedUser(user);
    setIsEditUserOpen(true);
  };

  const impersonateUser = async (_userId: string) => {
    toast.error("Impersonation feature is currently disabled.");
  };

  const isUserSuspended = (user: AdminUserView) => {
    return user.banned_until && new Date(user.banned_until) > new Date();
  };

  const handleSuspendClick = (user: AdminUserView) => {
    setUserToSuspend(user);
  };

  const handleSuspendConfirm = async () => {
    if (!userToSuspend) return;

    const suspend = !isUserSuspended(userToSuspend);
    const action = suspend ? "Suspending" : "Unsuspending";

    const toastId = toast.loading(`${action} user...`);

    // IMPORTANT: Admin API calls cannot be made from the browser (requires service role).
    // Use the admin-suspend-user edge function instead.
    const { data, error } = await supabase.functions.invoke("admin-suspend-user", {
      body: { userId: userToSuspend.id, suspend },
    });

    if (error) {
      toast.error(`Failed to ${action.toLowerCase()} user: ${error.message}`, { id: toastId });
    } else if ((data as any)?.error) {
      toast.error(`Failed to ${action.toLowerCase()} user: ${(data as any).error}`, { id: toastId });
    } else {
      toast.success((data as any)?.message || `User has been ${action.toLowerCase()}ed.`, { id: toastId });
      queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    }

    setUserToSuspend(null);
  };

  const handleDeleteClick = (user: AdminUserView) => {
    setUserToDelete(user);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    const toastId = toast.loading("Deleting user...");

    const { data, error } = await supabase.functions.invoke("admin-delete-user", {
      body: { userId: userToDelete.id },
    });

    if (error) {
      toast.error(`Failed to delete user: ${error.message}`, { id: toastId });
      return;
    }

    if ((data as any)?.error) {
      toast.error(`Failed to delete user: ${(data as any).error}`, { id: toastId });
      return;
    }

    toast.success((data as any)?.message || "User deleted.", { id: toastId });

    // Close details sheet if it was open for the deleted user
    if (sheetUserId === userToDelete.id) {
      updateSearchParams({ user: "" });
    }

    queryClient.invalidateQueries({ queryKey: ["adminUsers"] });
    setUserToDelete(null);
  };

  const memoizedColumns = useMemo(
    () =>
      columns({
        handleViewUser,
        handleEditUser,
        impersonateUser,
        handleSuspendClick,
        handleDeleteClick,
        navigate,
      }),
    [navigate]
  );

  return (
    <div className="container mx-auto p-4 md:p-6 lg:p-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">View, manage, and edit user accounts.</p>
        </div>
        <Button onClick={() => setIsAddUserOpen(true)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Add New User
        </Button>
      </div>

      <div className="bg-card border rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or ID..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-10"
            />
          </div>

          <Select value={kycStatus} onValueChange={(v) => handleFilterChange("kyc_status", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by KYC Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All KYC Statuses</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
              <SelectItem value="Not Submitted">Not Submitted</SelectItem>
            </SelectContent>
          </Select>

          <Select value={accountStatus} onValueChange={(v) => handleFilterChange("account_status", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Account Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Account Statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sort} onValueChange={(v) => handleSortChange(v as SortValue)}>
            <SelectTrigger>
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first (default)</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="name_asc">Name A → Z</SelectItem>
              <SelectItem value="name_desc">Name Z → A</SelectItem>
              <SelectItem value="email_asc">Email A → Z</SelectItem>
              <SelectItem value="email_desc">Email Z → A</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <p className="mt-3 text-xs text-muted-foreground">
          Tip: Default sorting is <span className="font-medium">Newest first</span>, so newly created users show at the top.
        </p>
      </div>

      <div className="space-y-4 md:hidden">
        {isLoading || isFetching ? (
          [...Array(5)].map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-lg" />)
        ) : isError ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-destructive">Error fetching users: {error.message}</p>
              <Button
                onClick={() => queryClient.invalidateQueries({ queryKey: ["adminUsers"] })}
                className="mt-4 mx-auto"
                variant="outline"
              >
                Retry
              </Button>
            </CardContent>
          </Card>
        ) : users && Array.isArray(users) && users.length > 0 ? (
          users.map((user) => (
            <Card key={user.id} className={isUserSuspended(user) ? "bg-muted/50" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{user.full_name || "N/A"}</CardTitle>
                    <CardDescription>{user.email}</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button aria-haspopup="true" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => handleViewUser(user.id)}>View Details</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/admin/users/${user.id}/payment-details`)}>
                        <FileText className="mr-2 h-4 w-4" />
                        Payment Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditUser(user)}>Edit User</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600" onClick={() => handleSuspendClick(user)}>
                        {isUserSuspended(user) ? "Unsuspend" : "Suspend"}
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-red-600" onClick={() => handleDeleteClick(user)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  {isUserSuspended(user) ? (
                    <Badge variant="destructive">Suspended</Badge>
                  ) : (
                    <Badge variant={user.role === "admin" ? "destructive" : "outline"}>{user.role}</Badge>
                  )}
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">KYC</span>
                  <Badge
                    variant={
                      user.kyc_status === "Approved"
                        ? "default"
                        : user.kyc_status === "Pending"
                          ? "outline"
                          : "secondary"
                    }
                  >
                    {user.kyc_status || "Not Submitted"}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Login</span>
                  <span>
                    {user.last_sign_in_at
                      ? formatDistanceToNow(new Date(user.last_sign_in_at), { addSuffix: true })
                      : "Never"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Wallet</span>
                  <span className="font-mono">₹{(user.wallet_balance || 0).toLocaleString("en-IN")}</span>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">No users found.</p>
              {debouncedSearchTerm && (
                <p className="text-center text-sm text-muted-foreground mt-2">Try adjusting your search terms or filters.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="hidden md:block">
        <DataTable columns={memoizedColumns} data={users || []} isLoading={isLoading || isFetching} error={error as Error | null} />
      </div>

      {totalPages > 1 && (
        <PaginationControls currentPage={page} totalPages={totalPages} onPageChange={handlePageChange} />
      )}

      <AddUserDialog isOpen={isAddUserOpen} onOpenChange={setIsAddUserOpen} />
      <EditUserDialog isOpen={isEditUserOpen} onOpenChange={setIsEditUserOpen} user={selectedUser} />
      <UserDetailsSheet userId={sheetUserId} isOpen={isSheetOpen} onOpenChange={handleSheetOpenChange} onViewUser={handleViewUser} />

      <AlertDialog open={!!userToSuspend} onOpenChange={() => setUserToSuspend(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {userToSuspend && isUserSuspended(userToSuspend)
                ? "This will unsuspend the user and allow them to log in again."
                : "This will suspend the user and prevent them from logging in."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSuspendConfirm}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user account and remove their related records. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserManagement;