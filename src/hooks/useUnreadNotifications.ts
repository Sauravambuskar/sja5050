import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';

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
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, queryKey]);

  return { count: count ?? 0 };
};