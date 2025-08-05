import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { ReferralTreeUser } from "@/types/database";
import { Skeleton } from "../ui/skeleton";
import { ReferralGraphNode } from "./ReferralGraphNode";
import { useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const fetchMyReferralTree = async (): Promise<ReferralTreeUser[]> => {
  const { data, error } = await supabase.rpc('get_my_referral_tree');
  if (error) throw new Error(error.message);
  return data || [];
};

// Helper function to build the tree
const buildTree = (list: ReferralTreeUser[]): ReferralTreeUser[] => {
    const map: { [key: string]: ReferralTreeUser & { children: ReferralTreeUser[] } } = {};
    const roots: (ReferralTreeUser & { children: ReferralTreeUser[] })[] = [];

    // First pass: create a map of all nodes
    list.forEach(node => {
        map[node.id] = { ...node, children: [] };
    });

    // Second pass: link children to their parents
    list.forEach(node => {
        if (node.level === 1) { // Assuming level 1 are direct referrals of the current user
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
  const { data: flatList, isLoading, isError, error } = useQuery<ReferralTreeUser[]>({
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
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Skeleton className="h-48 w-full" />
          </div>
        ) : isError ? (
          <div className="flex flex-col items-center justify-center text-center text-destructive p-4 border border-destructive rounded-md">
            <AlertTriangle className="h-8 w-8 mb-2" />
            <p className="font-semibold">Error loading referral tree</p>
            <p className="text-xs">{error.message}</p>
          </div>
        ) : treeData && treeData.length > 0 ? (
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
            You haven't referred anyone yet.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ReferralGraph;