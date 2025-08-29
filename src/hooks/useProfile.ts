import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Profile } from "@/types/database";

const fetchProfile = async (): Promise<Profile> => {
  const { data, error } = await supabase.rpc('get_my_profile').single();
  if (error) {
    throw new Error(error.message);
  }
  return data as Profile;
};

export const useProfile = () => {
  return useQuery<Profile, Error>({
    queryKey: ['myProfile'],
    queryFn: fetchProfile,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });
};