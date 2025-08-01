import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ReferralTreeUser } from "@/types/database";
import { Skeleton } from "../ui/skeleton";
import { ReferralGraphNode } from "../referrals/ReferralGraphNode";
import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

interface AdminReferralTreeProps {
  userId: string;
}

const fetchUserReferralTree = async (userId: string): Promise<ReferralTreeUser[]> => {
  const { data, error } = await supabase.rpc('get_user_referral_tree_for_admin', { p_user_id: userId });
  if (error) throw new Error(error.message);
  return data;
};

// Helper function to build the tree
const buildTree = (list: ReferralTreeUser[]): ReferralTreeUser[] => {
  const map: { [key: string]: ReferralTreeUser } = {};
  const roots: ReferralTreeUser[] = [];

  list.forEach(node => {
    map[node.id] = { ...node, children: [] };
  });

  list.forEach(node => {
    if (node.level === 1) {
      roots.push(map[node.id]);
    } else {
      const parent = map[node.parent_id];
      if (parent) {
        parent.children.push(map[node.id]);
      }
    }
  });

  return roots;
};

export const AdminReferralTree = ({ userId }: AdminReferralTreeProps) => {
  const { data: flatList, isLoading, isError, error } = useQuery<ReferralTreeUser[]>({
    queryKey: ['adminReferralTree', userId],
    queryFn: () => fetchUserReferralTree(userId),
    enabled: !!userId,
  });

  const treeData = useMemo(() => {
    if (!flatList) return [];
    return buildTree(flatList);
  }, [flatList]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center text-center text-destructive p-4 border border-destructive rounded-md">
        <AlertTriangle className="h-8 w-8 mb-2" />
        <p className="font-semibold">Error loading referral tree</p>
        <p className="text-xs">{error.message}</p>
      </div>
    );
  }

  return (
    <div>
      {treeData && treeData.length > 0 ? (
        <ScrollArea className="w-full whitespace-nowrap rounded-md border">
          <div className="flex justify-center p-8">
            <div className="relative flex">
              {treeData.map((node) => (
                <div key={node.id} className="px-4">
                  <ReferralGraphNode node={node} isRoot />
                </div>
              ))}
            </div>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      ) : (
        <div className="text-center text-muted-foreground p-8 border rounded-md">
          This user has not referred anyone.
        </div>
      )}
    </div>
  );
};