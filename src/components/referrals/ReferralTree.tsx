import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ReferralTreeUser } from "@/types/database";
import { Skeleton } from "../ui/skeleton";
import { ReferralTreeNode } from "./ReferralTreeNode";
import { useMemo } from "react";

const fetchMyReferralTree = async (): Promise<ReferralTreeUser[]> => {
  const { data, error } = await supabase.rpc('get_my_referral_tree');
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

const ReferralTree = () => {
  const { data: flatList, isLoading } = useQuery<ReferralTreeUser[]>({
    queryKey: ['myReferralTree'],
    queryFn: fetchMyReferralTree,
  });

  const treeData = useMemo(() => {
    if (!flatList) return [];
    return buildTree(flatList);
  }, [flatList]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Referral Network</CardTitle>
        <CardDescription>
          A tree view of your multi-level referral network.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : treeData && treeData.length > 0 ? (
          <div className="border rounded-md">
            {treeData.map((node) => (
              <ReferralTreeNode key={node.id} node={node} />
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground p-8">
            You haven't referred anyone yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReferralTree;