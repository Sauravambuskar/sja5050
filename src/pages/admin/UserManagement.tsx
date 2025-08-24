import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AdminUserView } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Eye, Loader2, Search, UserCog, UserPlus, Download } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious, PaginationEllipsis } from "@/components/ui/pagination";
import { usePagination, DOTS } from "@/hooks/usePagination";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { usePageLayoutContext } from "@/components/layout/PageLayout";
import { useAuth } from "@/components/auth/AuthProvider";
import { EditUserSheet } from "@/components/admin/users/EditUserSheet"; // Corrected import path
import { toast } from "sonner";
import { exportToCsv } from "@/lib/utils";

const PAGE_SIZE = 20;

const fetchUsers = async (page: number, searchTerm: string, kycStatus: string, accountStatus: string) => {
  const { data, error } = await supabase.rpc('get_all_users_details', {
    page_limit: PAGE_SIZE,
    page_offset: (page - 1) * PAGE_SIZE,
    search_text: searchTerm || null,
    kyc_status_filter: kycStatus || null,
    account_status_filter: accountStatus || null,
  });
  if (error) throw new Error(error.message);
  return data as AdminUserView[];
};

const fetchUsersCount = async (searchTerm: string, kycStatus: string, accountStatus: string) => {
  const { data, error } = await supabase.rpc('get_all_users_details_count', {
    search_text: searchTerm || null,
    kyc_status_filter: kycStatus || null,
    account_status_filter: accountStatus || null,
  });
  if (error) throw new Error(error.message);
  return data;
};

const exportAllUsers = async (searchTerm: string, kycStatus: string, accountStatus: string) => {
  const { data, error } = await supabase.rpc('export_all_users_details', {
    search_text: searchTerm || null,
    kyc_status_filter: kycStatus || null,
    account_status_filter: accountStatus || null,
  });
  if (error) throw new Error(error.message);
  return data;
};

export const UserManagement = () => {
  const { handleViewUser } = usePageLayoutContext();
  const { impersonateUser } = useAuth();
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<AdminUserView | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [kycStatusFilter, setKycStatusFilter] = useState("");
  const [accountStatusFilter, setAccountStatusFilter] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);

  const { data: users, isLoading } = useQuery({
    queryKey: ['adminUsers', currentPage, debouncedSearchTerm, kycStatusFilter, accountStatusFilter],
    queryFn: () => fetchUsers(currentPage, debouncedSearchTerm, kycStatusFilter, accountStatusFilter),
    placeholderData: (prev) => prev,
  });

  const { data: totalUsers } = useQuery({
    queryKey: ['adminUsersCount', debouncedSearchTerm, kycStatusFilter, accountStatusFilter],
    queryFn: () => fetchUsersCount(debouncedSearchTerm, kycStatusFilter, accountStatusFilter),
  });

  const pageCount = totalUsers ? Math.ceil(totalUsers / PAGE_SIZE) : 0;
  const paginationRange = usePagination({ currentPage, totalCount: totalUsers || 0, pageSize: PAGE_SIZE });

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const dataToExport = await exportAllUsers(debouncedSearchTerm, kycStatusFilter, accountStatusFilter);
      exportToCsv(`sja_users_${new Date().toISOString().split('T')[0]}.csv`, dataToExport);
      toast.success("User data exported successfully.");
    } catch (error: any) {
      toast.error(`Export failed: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const renderPagination = () => (
    pageCount > 1 && (
      <Pagination className="mt-6">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); if (currentPage > 1) setCurrentPage(p => p - 1); }} className={cn(currentPage === 1 && "pointer-events-none opacity-50")} />
          </PaginationItem>
          {paginationRange?.map((pageNumber, index) => {
            if (pageNumber === DOTS) {
              return <PaginationItem key={`dots-${index}`}><PaginationEllipsis /></PaginationItem>;
            }
            return (
              <PaginationItem key={pageNumber}>
                <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(pageNumber as number); }} isActive={currentPage === pageNumber}>
                  {pageNumber}
                </PaginationLink>
              </PaginationItem>
            );
          })}
          <PaginationItem>
            <PaginationNext href="#" onClick={(e) => { e.preventDefault(); if (currentPage < pageCount) setCurrentPage(p => p + 1); }} className={cn(currentPage === pageCount && "pointer-events-none opacity-50")} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    )
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-muted-foreground">View, manage, and edit user accounts.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={isExporting}>
            {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Export CSV
          </Button>
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Add New User
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, email, or ID..."
            className="pl-8 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {/* Add filters here if needed */}
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>KYC Status</TableHead>
              <TableHead>Account Status</TableHead>
              <TableHead>Join Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && !users ? (
              [...Array(10)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={5}><Loader2 className="h-4 w-4 animate-spin" /></TableCell>
                </TableRow>
              ))
            ) : users && users.length > 0 ? (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium">{user.full_name || 'N/A'}</div>
                    <div className="text-sm text-muted-foreground">{user.email}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.kyc_status === 'Approved' ? 'success' : user.kyc_status === 'Pending' ? 'outline' : 'destructive'}>
                      {user.kyc_status || 'Not Submitted'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={!user.banned_until ? 'success' : 'destructive'}>
                      {!user.banned_until ? 'Active' : 'Suspended'}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(user.join_date), "PPP")}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleViewUser(user.id)}>
                          <Eye className="mr-2 h-4 w-4" /> View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setSelectedUserForEdit(user)}>
                          <UserCog className="mr-2 h-4 w-4" /> Edit User
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => impersonateUser(user.id)}>
                          Impersonate User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {renderPagination()}
      {selectedUserForEdit && (
        <EditUserSheet
          user={selectedUserForEdit}
          isOpen={!!selectedUserForEdit}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setSelectedUserForEdit(null);
            }
          }}
        />
      )}
    </div>
  );
};