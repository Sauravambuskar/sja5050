import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ReferralTreeUser } from "@/types/database";
import { Skeleton } from "../ui/skeleton";
import { ReferralGraphNode } from "./ReferralGraphNode";
import { useMemo } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

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

const ReferralGraph = () => {
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
          A visual representation of your multi-level referral network.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="w-full whitespace-nowrap rounded-md border">
          <div className="flex justify-center p-8">
            {isLoading ? (
              <Skeleton className="h-40 w-80" />
            ) : treeData && treeData.length > 0 ? (
              <div className="relative flex">
                {treeData.map((node) => (
                  <div key={node.id} className="px-4">
                    <ReferralGraphNode node={node} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-muted-foreground p-8">
                You haven't referred anyone yet.
              </div>
            )}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ReferralGraph;