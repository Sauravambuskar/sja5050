import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Profile } from "@/types/database";
import { useAuth } from "@/components/auth/AuthProvider";

const fetchProfile = async (userId: string): Promise<Profile> => {
  const { data, error } = await supabase.rpc('get_my_profile').single();
  if (error) {
    throw new Error(error.message);
  }
  return data as Profile;
};

export const useProfile = () => {
  const { user } = useAuth();
  
  return useQuery<Profile, Error>({
    queryKey: ['myProfile', user?.id],
    queryFn: () => fetchProfile(user!.id),
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 1,
  });
};