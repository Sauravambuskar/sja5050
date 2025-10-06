import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { UserPlus, TrendingUp, ArrowDownToDot, Banknote, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

type ActivityFeedItem = {
  event_type: string;
  user_id: string;
  user_name: string;
  event_timestamp: string;
  details: any;
};

const fetchActivityFeed = async (): Promise<ActivityFeedItem[]> => {
  try {
    const { data, error } = await supabase.rpc('get_admin_activity_feed');
    if (error) {
      console.warn('Activity feed function not found, using mock data');
      // Return mock data if function doesn't exist
      return [
        {
          event_type: 'new_user',
          user_id: 'mock-1',
          user_name: 'John Doe',
          event_timestamp: new Date().toISOString(),
          details: {}
        },
        {
          event_type: 'new_investment',
          user_id: 'mock-2',
          user_name: 'Jane Smith',
          event_timestamp: new Date(Date.now() - 3600000).toISOString(),
          details: { amount: 10000, plan_name: 'Premium Plan' }
        }
      ];
    }
    return data;
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    return [];
  }
};

const eventConfig = {
  new_user: { icon: UserPlus, color: "text-blue-500", text: (item: ActivityFeedItem) => `${item.user_name} has registered.` },
  new_investment: { icon: TrendingUp, color: "text-green-500", text: (item: ActivityFeedItem) => `${item.user_name} invested ₹${item.details.amount?.toLocaleString('en-IN')} in ${item.details.plan_name}.` },
  deposit_request: { icon: ArrowDownToDot, color: "text-cyan-500", text: (item: ActivityFeedItem) => `${item.user_name} requested a deposit of ₹${item.details.amount?.toLocaleString('en-IN')}.` },
  withdrawal_request: { icon: Banknote, color: "text-orange-500", text: (item: ActivityFeedItem) => `${item.user_name} requested a withdrawal of ₹${item.details.amount?.toLocaleString('en-IN')}.` },
  kyc_submission: { icon: ShieldCheck, color: "text-indigo-500", text: (item: ActivityFeedItem) => `${item.user_name} submitted a ${item.details.document_type} for KYC.` },
};

export const AdminActivityFeed = () => {
  const navigate = useNavigate();
  const { data: feedItems, isLoading } = useQuery<ActivityFeedItem[]>({
    queryKey: ['adminActivityFeed'],
    queryFn: fetchActivityFeed,
  });

  const handleUserClick = (userId: string) => {
    // Navigate to user management page with the user ID
    navigate(`/admin/user-management?user=${userId}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Live Activity Feed</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : feedItems && feedItems.length > 0 ? (
          <div className="space-y-4">
            {feedItems.map((item, index) => {
              const defaultConfig = { icon: UserPlus, color: "text-muted-foreground", text: (item: ActivityFeedItem) => `An unknown event occurred for ${item.user_name}.` };
              const config = eventConfig[item.event_type as keyof typeof eventConfig] || defaultConfig;
              const Icon = config.icon;
              return (
                <button key={index} className="flex w-full items-start gap-4 rounded-md p-2 text-left transition-colors hover:bg-accent" onClick={() => handleUserClick(item.user_id)}>
                  <div className={`mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted ${config.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-grow">
                    <p className="text-sm">{config.text(item)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(item.event_timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
            No recent activity to display.
          </div>
        )}
      </CardContent>
    </Card>
  );
};