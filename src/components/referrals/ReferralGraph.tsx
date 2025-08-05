import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ReferralTreeUser } from "@/types/database";
import { Skeleton } from "../ui/skeleton";
import { ReferralCard } from "./ReferralCard";

const fetchMyReferralTree = async (): Promise<ReferralTreeUser[]> => {
  const { data, error } = await supabase.rpc('get_my_referral_tree');
  if (error) throw new Error(error.message);
  if (!data) return [];
  // Sort by level, then by name
  return data.sort((a, b) => {
    if (a.level < b.level) return -1;
    if (a.level > b.level) return 1;
    if (!a.full_name || !b.full_name) return 0;
    return a.full_name.localeCompare(b.full_name);
  });
};

const ReferralGraph = () => {
  const { data: flatList, isLoading } = useQuery<ReferralTreeUser[]>({
    queryKey: ['myReferralTree'],
    queryFn: fetchMyReferralTree,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Referral Network</CardTitle>
        <CardDescription>
          A list of all users in your multi-level referral network.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : flatList && flatList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {flatList.map((referral) => (
              <ReferralCard key={referral.id} referral={referral} />
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground p-8 border rounded-md">
            You haven't referred anyone yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReferralGraph;