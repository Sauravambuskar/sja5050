import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, CheckCircle, XCircle, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Notification as NotificationType } from "@/types/database";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";

const fetchNotifications = async (): Promise<NotificationType[]> => {
  const { data, error } = await supabase.rpc('get_my_notifications');
  if (error) throw new Error(error.message);
  return data;
};

const markAsRead = async () => {
  const { error } = await supabase.rpc('mark_my_notifications_as_read');
  if (error) throw new Error(error.message);
};

const iconMap = {
  success: { component: CheckCircle, color: "text-green-500" },
  error: { component: XCircle, color: "text-red-500" },
  info: { component: Info, color: "text-blue-500" },
  warning: { component: AlertTriangle, color: "text-yellow-500" },
};

const Notifications = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: notifications, isLoading } = useQuery<NotificationType[]>({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
  });

  const { mutate: markNotificationsAsRead } = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      // Invalidate both the notifications list and the unread count for the sidebar badge
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      if (user) {
        queryClient.invalidateQueries({ queryKey: ['unreadNotificationsCount', user.id] });
      }
    },
  });

  useEffect(() => {
    // Mark notifications as read when the component mounts
    if (user) {
      markNotificationsAsRead();
    }
  }, [user, markNotificationsAsRead]);

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Notifications</h1>
      </div>
      <p className="text-muted-foreground">
        Here are your recent alerts and updates.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>All your notifications will appear here.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              [...Array(3)].map((_, i) => (
                <div key={i} className="flex items-start space-x-4 rounded-md border p-4">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              ))
            ) : notifications && notifications.length > 0 ? (
              notifications.map((notification) => {
                const Icon = iconMap[notification.type]?.component || Bell;
                const iconColor = iconMap[notification.type]?.color || "text-muted-foreground";
                const content = (
                  <div className={cn("flex items-start space-x-4 rounded-md border p-4", !notification.is_read && "bg-accent")}>
                    <Icon className={cn("h-6 w-6 flex-shrink-0", iconColor)} />
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{notification.title}</p>
                      <p className="text-sm text-muted-foreground">{notification.description}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                    </p>
                  </div>
                );
                return notification.link_to ? (
                  <Link to={notification.link_to} key={notification.id} className="block hover:bg-accent/50 rounded-md">
                    {content}
                  </Link>
                ) : (
                  <div key={notification.id}>{content}</div>
                );
              })
            ) : (
              <div className="text-center text-muted-foreground p-8">
                <Bell className="mx-auto h-12 w-12" />
                <p className="mt-4">You have no notifications yet.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
};
export default Notifications;