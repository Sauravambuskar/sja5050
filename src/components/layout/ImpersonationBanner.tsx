import { AlertTriangle } from "lucide-react";
import { Button } from "../ui/button";
import { useAuth } from "../auth/AuthProvider";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

const fetchCurrentProfile = async () => {
  const { data, error } = await supabase.rpc('get_my_profile');
  if (error) throw error;
  return data[0];
};

export const ImpersonationBanner = () => {
  const { stopImpersonating } = useAuth();
  const { data: profile } = useQuery({
    queryKey: ['myProfile'], // Re-uses the existing query
    queryFn: fetchCurrentProfile,
  });

  return (
    <div className="sticky top-0 z-50 flex items-center justify-center gap-x-6 bg-yellow-500 px-6 py-2.5 sm:px-3.5">
      <div className="flex items-center text-sm leading-6 text-white">
        <AlertTriangle className="h-5 w-5 mr-2" />
        <p>
          <strong>Admin View:</strong> You are currently viewing the platform as <span className="font-bold underline">{profile?.full_name || '...'}</span>.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="bg-white text-yellow-600 hover:bg-gray-100"
        onClick={stopImpersonating}
      >
        Return to Admin
      </Button>
    </div>
  );
};