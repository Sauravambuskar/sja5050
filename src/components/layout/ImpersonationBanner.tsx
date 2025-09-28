import { useAuth } from "../auth/AuthProvider";
import { Button } from "../ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const fetchImpersonatedUserProfile = async (userId: string | undefined) => {
  if (!userId) return null;
  const { data, error } = await supabase.from('profiles').select('full_name').eq('id', userId).single();
  if (error) throw new Error(error.message);
  return data;
};

export const ImpersonationBanner = () => {
  const { revertImpersonation, session } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ['impersonated_user_profile', session?.user?.id],
    queryFn: () => fetchImpersonatedUserProfile(session?.user?.id),
    enabled: !!session?.user?.id,
  });

  return (
    <div className="bg-yellow-500 text-black p-2 text-center text-sm flex justify-center items-center gap-4">
      <span>
        Admin View: You are currently viewing the platform as {profile?.full_name || session?.user?.email}.
      </span>
      <Button onClick={revertImpersonation} size="sm" variant="outline" className="bg-white hover:bg-gray-100 text-black">
        Return to Admin
      </Button>
    </div>
  );
};