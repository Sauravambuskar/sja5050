import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { AdminActivityFeedItem } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { UserPlus, TrendingUp, ArrowDownToDot, Banknote, ShieldCheck } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { PageLayoutContext } from "@/components/layout/PageLayout";

const fetchActivityFeed = async (): Promise<AdminActivityFeedItem[]> => {
  const { data, error } = await supabase.rpc('get_admin_activity_feed');
  if (error) throw new Error(error.message);
  return data;
};

const getInitials = (name: string | null | undefined) => {
  if (!name) return "U";
  return name.split(' ').map(n => n[0]).join('').toUpperCase();
};

const eventConfig = {
  new_user: { icon: UserPlus, color: "text-blue-500", bgColor: "bg-blue-50" },
  new_investment: { icon: TrendingUp, color: "text-green-500", bgColor: "bg-green-50" },
  deposit_request: { icon: ArrowDownToDot, color: "text-sky-500", bgColor: "bg-sky-50" },
  withdrawal_request: { icon: Banknote, color: "text-orange-500", bgColor: "bg-orange-50" },
  kyc_submission: { icon: ShieldCheck, color: "text-indigo-500", bgColor: "bg-indigo-50" },
};

export const AdminActivityFeed = () => {
  const { handleViewUser } = useOutletContext<PageLayoutContext>();
  const { data: feedItems, isLoading } = useQuery<AdminActivityFeedItem[]>({
    queryKey: ['adminActivityFeed'],
    queryFn: fetchActivityFeed,
  });

  const renderDescription = (item: AdminActivityFeedItem) => {
    switch (item.event_type) {
      case 'new_user':
        return <>signed up.</>;
      case 'new_investment':
        return <>made a new investment of <span className="font-semibold">₹{item.details.amount?.toLocaleString('en-IN')}</span> in the {item.details.plan_name} plan.</>;
      case 'deposit_request':
        return <>requested a deposit of <span className="font-semibold">₹{item.details.amount?.toLocaleString('en-IN')}</span>.</>;
      case 'withdrawal_request':
        return <>requested a withdrawal of <span className="font-semibold">₹{item.details.amount?.toLocaleString('en-IN')}</span>.</>;
      case 'kyc_submission':
        return <>submitted a <span className="font-semibold">{item.details.document_type}</span> for KYC verification.</>;
      default:
        return null;
    }
  };

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader>
        <CardTitle>Platform Activity Feed</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : feedItems && feedItems.length > 0 ? (
          <div className="space-y-2">
            {feedItems.map((item, index) => {
              const config = eventConfig[item.event_type];
              const Icon = config.icon;
              return (
                <button
                  key={`${item.user_id}-${item.timestamp}-${index}`}
                  className="flex w-full items-start gap-4 rounded-md p-2 text-left transition-colors hover:bg-accent"
                  onClick={() => handleViewUser(item.user_id)}
                >
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${config.bgColor}`}>
                    <Icon className={`h-5 w-5 ${config.color}`} />
                  </div>
                  <div className="flex-grow">
                    <p className="text-sm">
                      <span className="font-semibold">{item.user_name}</span> {renderDescription(item)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
            No recent activity on the platform.
          </div>
        )}
      </CardContent>
    </Card>
  );
};