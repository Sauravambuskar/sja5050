import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  isImpersonating: boolean;
  impersonateUser: (userId: string) => void;
  stopImpersonating: () => void;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const fetchUserRole = async (user: User | null) => {
  if (!user) return false;
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (error) {
    console.error("Error fetching user role:", error);
    return false;
  }
  return data?.role === 'admin';
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const { data: isAdmin } = useQuery({
    queryKey: ['userRole', user?.id],
    queryFn: () => fetchUserRole(user),
    enabled: !!user,
    initialData: false,
  });

  const impersonateUser = (userId: string) => {
    // In a real app, you'd get a special token from a secure backend function
    console.log(`Impersonating user ${userId}. This is a placeholder.`);
    setIsImpersonating(true);
    // You might store the original admin session in local storage
  };

  const stopImpersonating = () => {
    console.log("Stopping impersonation.");
    setIsImpersonating(false);
    // Restore original admin session
    queryClient.invalidateQueries(); // Refetch data as the original user
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = {
    session,
    user,
    isAdmin: (isAdmin || false) && !isImpersonating,
    loading,
    isImpersonating,
    impersonateUser,
    stopImpersonating,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};