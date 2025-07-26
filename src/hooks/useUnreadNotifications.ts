import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';
import { Notification as NotificationType } from '@/types/database';

const fetchUnreadCount = async () => {
  const { data, error } = await supabase.rpc('get_my_unread_notifications_count');
  if (error) {
    console.error("Error fetching unread notification count:", error);
    return 0;
  }
  return data;
};

export const useUnreadNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['unreadNotificationsCount', user?.id];

  const { data: count } = useQuery<number>({
    queryKey,
    queryFn: fetchUnreadCount,
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          // 1. Invalidate query to update the sidebar badge count
          queryClient.invalidateQueries({ queryKey });

          // 2. Show a real-time toast notification
          const newNotification = payload.new as NotificationType;
          if (newNotification) {
            const { title, description, type } = newNotification;
            switch (type) {
              case 'success':
                toast.success(title, { description });
                break;
              case 'error':
                toast.error(title, { description });
                break;
              case 'warning':
                toast.warning(title, { description });
                break;
              default:
                toast.info(title, { description });
                break;
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, queryKey]);

  return { count: count ?? 0 };
};