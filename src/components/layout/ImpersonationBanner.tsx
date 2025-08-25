import { useAuth } from "../auth/AuthProvider";
import { Button } from "../ui/button";
import { AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const fetchProfile = async (userId: string | undefined) => {
  if (!userId) return null;
  const { data, error } = await supabase.from('profiles').select('full_name').eq('id', userId).single();
  if (error) throw error;
  return data;
};

export const ImpersonationBanner = () => {
  const { stopImpersonating } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ['impersonatedUserProfile'],
    queryFn: () => fetchProfile(supabase.auth.getUser()?.id),
  });

  return (
    <div className="bg-yellow-500 text-yellow-900 p-2 text-center text-sm flex items-center justify-center gap-4">
      <AlertTriangle className="h-5 w-5" />
      <span>
        You are currently impersonating <strong>{profile?.full_name || 'a user'}</strong>.
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={stopImpersonating}
        className="hover:bg-yellow-600/50"
      >
        Return to Admin View
      </Button>
    </div>
  );
};