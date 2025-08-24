import { useAuth } from "@/components/auth/AuthProvider";

export const useIsAdmin = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  return { isAdmin, authLoading };
};