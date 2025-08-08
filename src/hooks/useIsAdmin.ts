import { useAuth } from "@/components/auth/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const fetchIsAdmin = async (userId: string | undefined): Promise<boolean> => {
  if (!userId) return false;
  const { data, error } = await supabase.rpc('is_admin');
  if (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
  return data;
};

export const useIsAdmin = () => {
  const { user, isLoading: authLoading } = useAuth();
  const { data: isAdmin, isLoading: rpcLoading } = useQuery({
    queryKey: ['isAdminCheck', user?.id],
    queryFn: () => fetchIsAdmin(user?.id),
    enabled: !!user,
  });

  return {
    isAdmin: isAdmin ?? false,
    isLoading: authLoading || rpcLoading,
  };
};