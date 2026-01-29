import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, Eye, TrendingUp } from "lucide-react";

export type ReferralTreeRow = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  join_date: string;
  kyc_status: string;
  has_invested: boolean;
  level: number;
  parent_id: string;
};

type RootUser = {
  id: string;
  full_name: string | null;
  member_id: string | null;
  kyc_status: string | null;
};

async function fetchRootUser(userId: string): Promise<RootUser> {
  const { data, error } = await supabase.rpc("get_user_profile_for_admin", { user_id_to_fetch: userId });
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error("User not found.");
  return {
    id: data[0].id,
    full_name: data[0].full_name,
    member_id: data[0].member_id,
    kyc_status: data[0].kyc_status,
  };
}

async function fetchTree(userId: string): Promise<ReferralTreeRow[]> {
  const { data, error } = await supabase.rpc("get_user_referral_tree_for_admin", { p_user_id: userId });
  if (error) throw new Error(error.message);
  return (data || []) as ReferralTreeRow[];
}

function buildTree(rootId: string, rows: ReferralTreeRow[]) {
  const map = new Map<string, ReferralTreeRow & { children: string[] }>();
  for (const r of rows) {
    map.set(r.id, { ...r, children: [] });
  }
  for (const r of rows) {
    if (r.parent_id === rootId) continue;
    const parent = map.get(r.parent_id);
    if (parent) parent.children.push(r.id);
  }

  const rootChildren = rows
    .filter((r) => r.parent_id === rootId)
    .map((r) => r.id);

  return { map, rootChildren };
}

function statusVariant(status?: string | null) {
  if (!status) return "outline" as const;
  if (status === "Approved") return "default" as const;
  if (status === "Pending") return "outline" as const;
  return "destructive" as const;
}

function countByLevel(rows: ReferralTreeRow[]) {
  const counts: Record<number, number> = {};
  for (const r of rows) counts[r.level] = (counts[r.level] || 0) + 1;
  return counts;
}

export function ReferralTreeViewer({
  rootUserId,
  onSelectTarget,
  className,
}: {
  rootUserId: string;
  onSelectTarget: (userId: string) => void;
  className?: string;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set([rootUserId]));

  const { data: rootUser, isLoading: rootLoading } = useQuery({
    queryKey: ["adminReferralRootUser", rootUserId],
    queryFn: () => fetchRootUser(rootUserId),
    enabled: !!rootUserId,
  });

  const { data: rows, isLoading: treeLoading } = useQuery({
    queryKey: ["adminReferralTree", rootUserId],
    queryFn: () => fetchTree(rootUserId),
    enabled: !!rootUserId,
  });

  const tree = useMemo(() => {
    return buildTree(rootUserId, rows || []);
  }, [rootUserId, rows]);

  const stats = useMemo(() => {
    const r = rows || [];
    return {
      total: r.length,
      invested: r.filter((x) => x.has_invested).length,
      byLevel: countByLevel(r),
    };
  }, [rows]);

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderNode = (id: string, depth: number) => {
    const node = tree.map.get(id);
    if (!node) return null;
    const hasChildren = node.children.length > 0;
    const isOpen = expanded.has(id);

    return (
      <div key={id} className="space-y-1">
        <div
          className={cn(
            "flex items-center justify-between rounded-md border bg-background px-3 py-2",
            depth === 0 ? "border-primary/30" : "border-border"
          )}
          style={{ marginLeft: depth * 18 }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <button
              type="button"
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded hover:bg-muted",
                !hasChildren && "opacity-0 pointer-events-none"
              )}
              onClick={() => toggle(id)}
              aria-label={isOpen ? "Collapse" : "Expand"}
            >
              {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2 min-w-0">
                <p className="font-medium truncate">{node.full_name}</p>
                <Badge variant={statusVariant(node.kyc_status)} className="shrink-0">
                  {node.kyc_status}
                </Badge>
                {node.has_invested && (
                  <Badge variant="secondary" className="shrink-0">
                    <TrendingUp className="mr-1 h-3.5 w-3.5" /> Invested
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Level {node.level} • Joined {new Date(node.join_date).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={() => onSelectTarget(id)}>
              Manage
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onSelectTarget(id)} title="Open user tools">
              <Eye className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {hasChildren && isOpen && (
          <div className="space-y-1">
            {node.children.map((cid) => renderNode(cid, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={cn("space-y-4", className)}>
      <Card>
        <CardHeader>
          <CardTitle>Referral Tree</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(rootLoading || treeLoading) && (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          )}

          {!rootLoading && rootUser && (
            <div className="rounded-md border bg-muted/30 p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold truncate">{rootUser.full_name || "User"}</p>
                  <p className="text-xs text-muted-foreground">Root • {rootUser.member_id || rootUser.id}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={statusVariant(rootUser.kyc_status)}>{rootUser.kyc_status || "N/A"}</Badge>
                  <Button variant="outline" size="sm" onClick={() => onSelectTarget(rootUser.id)}>
                    Manage
                  </Button>
                </div>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-md border bg-background px-3 py-2">
                  <p className="text-xs text-muted-foreground">Total Downline</p>
                  <p className="text-lg font-semibold">{stats.total}</p>
                </div>
                <div className="rounded-md border bg-background px-3 py-2">
                  <p className="text-xs text-muted-foreground">Invested</p>
                  <p className="text-lg font-semibold">{stats.invested}</p>
                </div>
                <div className="rounded-md border bg-background px-3 py-2">
                  <p className="text-xs text-muted-foreground">Level 1 / 2 / 3+</p>
                  <p className="text-lg font-semibold">
                    {(stats.byLevel[1] || 0)} / {(stats.byLevel[2] || 0)} / {Object.entries(stats.byLevel)
                      .filter(([k]) => Number(k) >= 3)
                      .reduce((sum, [, v]) => sum + v, 0)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {!treeLoading && (rows?.length || 0) === 0 && (
            <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
              No downline referrals found for this user.
            </div>
          )}

          {!treeLoading && (rows?.length || 0) > 0 && (
            <div className="space-y-2">
              {tree.rootChildren.map((cid) => renderNode(cid, 0))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
