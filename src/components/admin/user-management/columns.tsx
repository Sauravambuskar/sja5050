"use client";

import { ColumnDef } from "@tanstack/react-table";
import { AdminUserView } from "@/types/database";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, FileText, LogIn } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const isUserSuspended = (user: AdminUserView) => {
  return user.banned_until && new Date(user.banned_until) > new Date();
};

interface ColumnsProps {
  handleViewUser: (userId: string) => void;
  handleEditUser: (user: AdminUserView) => void;
  impersonateUser: (userId: string) => void;
  handleSuspendClick: (user: AdminUserView) => void;
  navigate: (path: string) => void;
}

export const columns = ({
  handleViewUser,
  handleEditUser,
  impersonateUser,
  handleSuspendClick,
  navigate,
}: ColumnsProps): ColumnDef<AdminUserView>[] => [
  {
    accessorKey: "full_name",
    header: "User",
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className="flex flex-col">
          <span className="font-medium">{user.full_name || "N/A"}</span>
          <span className="text-xs text-muted-foreground">{user.email}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "role",
    header: "Status",
    cell: ({ row }) => {
      const user = row.original;
      return isUserSuspended(user) ? (
        <Badge variant="destructive">Suspended</Badge>
      ) : (
        <Badge variant={user.role === "admin" ? "destructive" : "outline"}>
          {user.role}
        </Badge>
      );
    },
  },
  {
    accessorKey: "kyc_status",
    header: "KYC",
    cell: ({ row }) => {
      const user = row.original;
      return (
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
      );
    },
  },
  {
    accessorKey: "wallet_balance",
    header: "Wallet",
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("wallet_balance") || "0");
      const formatted = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(amount);
      return <div className="font-mono">{formatted}</div>;
    },
  },
  {
    accessorKey: "last_sign_in_at",
    header: "Last Login",
    cell: ({ row }) => {
      const lastLogin = row.getValue("last_sign_in_at");
      return lastLogin
        ? formatDistanceToNow(new Date(lastLogin as string), {
            addSuffix: true,
          })
        : "Never";
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className="text-right">
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
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate(`/admin/users/${user.id}/payment-details`)}
              >
                <FileText className="mr-2 h-4 w-4" />
                Payment Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEditUser(user)}>
                Edit User
              </DropdownMenuItem>
              {/* The 'signInWithId' method does not exist in the Supabase client library.
                  Impersonation requires a secure server-side implementation (e.g., an Edge Function).
                  This feature is temporarily disabled to resolve compilation errors. */}
              {/* <DropdownMenuItem onClick={() => impersonateUser(user.id)}>
                <LogIn className="mr-2 h-4 w-4" />
                Login as User
              </DropdownMenuItem> */}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600"
                onClick={() => handleSuspendClick(user)}
              >
                {isUserSuspended(user) ? "Unsuspend" : "Suspend"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];