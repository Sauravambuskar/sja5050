import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ReferralNetworkMember } from "@/types/database";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface AdminReferralNetworkTableProps {
  userId: string;
  onViewUser: (userId: string) => void;
}

const fetchReferralNetwork = async (userId: string) => {
  const { data, error } = await supabase.rpc('get_user_referral_network_flat_for_admin', { p_user_id: userId });
  if (error) {
    throw new Error(error.message);
  }
  return data as ReferralNetworkMember[];
};

export const AdminReferralNetworkTable = ({ userId, onViewUser }: AdminReferralNetworkTableProps) => {
  const { data: referrals, isLoading, isError, error } = useQuery<ReferralNetworkMember[]>({
    queryKey: ['adminReferralNetwork', userId],
    queryFn: () => fetchReferralNetwork(userId),
  });

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sr. No.</TableHead>
            <TableHead>DOJ</TableHead>
            <TableHead>Distributor ID</TableHead>
            <TableHead>Distributor Name</TableHead>
            <TableHead>Sponsor ID</TableHead>
            <TableHead>Sponsor Name</TableHead>
            <TableHead>City</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-8 w-20 ml-auto" /></TableCell>
              </TableRow>
            ))
          ) : isError ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-destructive">
                Error: {error.message}
              </TableCell>
            </TableRow>
          ) : referrals && referrals.length > 0 ? (
            referrals.map((referral, index) => (
              <TableRow key={referral.user_id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{format(new Date(referral.join_date), "dd-MM-yyyy")}</TableCell>
                <TableCell>{referral.member_id}</TableCell>
                <TableCell>{referral.full_name}</TableCell>
                <TableCell>{referral.sponsor_member_id}</TableCell>
                <TableCell>{referral.sponsor_full_name}</TableCell>
                <TableCell>{referral.city || 'N/A'}</TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" size="sm" onClick={() => onViewUser(referral.user_id)}>
                    View User
                  </Button>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={8} className="text-center">
                This user has no referrals.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};