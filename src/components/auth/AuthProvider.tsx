import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  isImpersonating: boolean;
  signOut: () => Promise<void>;
  impersonateUser: (userId: string) => Promise<void>;
  stopImpersonating: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const fetchIsAdmin = async (user: User | null): Promise<boolean> => {
  if (!user) return false;
  const { data, error } = await supabase.rpc('is_admin');
  if (error) {
    console.error("Error checking admin status:", error);
    return false;
  }
  return data;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [originalSession, setOriginalSession] = useState<Session | null>(null);

  const { data: isAdmin, isLoading: isAdminLoading } = useQuery({
    queryKey: ['isAdmin', user?.id],
    queryFn: () => fetchIsAdmin(user),
    enabled: !!user && !isImpersonating,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setIsLoading(false);
    };
    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      // Only update if not impersonating, or if the session is null (sign out)
      if (!sessionStorage.getItem('impersonating_admin_session')) {
        setSession(session);
        setUser(session?.user ?? null);
      }
      setIsLoading(false);
    });

    return () => authListener?.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await stopImpersonating();
    await supabase.auth.signOut();
    queryClient.clear();
  };

  const impersonateUser = async (userId: string) => {
    const { data: currentSessionData } = await supabase.auth.getSession();
    if (!currentSessionData.session) {
      toast.error("You must be logged in to impersonate.");
      return;
    }
    
    toast.loading("Starting impersonation...");
    try {
      const { data, error } = await supabase.functions.invoke('impersonate-user', {
        body: { userId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Store admin session
      setOriginalSession(currentSessionData.session);
      sessionStorage.setItem('impersonating_admin_session', JSON.stringify(currentSessionData.session));

      // Set impersonated session
      const newSession = {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      };
      await supabase.auth.setSession(newSession);
      
      setUser(data.user);
      setSession({ ...currentSessionData.session, ...newSession, user: data.user });
      setIsImpersonating(true);
      
      toast.dismiss();
      toast.success(`Now impersonating user ${data.user.email}`);
      window.location.href = '/dashboard';

    } catch (e: any) {
      toast.dismiss();
      toast.error(`Impersonation failed: ${e.message}`);
    }
  };

  const stopImpersonating = async () => {
    const storedAdminSession = sessionStorage.getItem('impersonating_admin_session');
    if (!storedAdminSession) return;

    try {
      const adminSession = JSON.parse(storedAdminSession);
      await supabase.auth.setSession({
        access_token: adminSession.access_token,
        refresh_token: adminSession.refresh_token,
      });
      
      setSession(adminSession);
      setUser(adminSession.user);
      setIsImpersonating(false);
      setOriginalSession(null);
      sessionStorage.removeItem('impersonating_admin_session');
      
      toast.success("Stopped impersonating. Welcome back!");
      window.location.href = '/admin/users';
    } catch (e: any) {
      toast.error(`Could not stop impersonating: ${e.message}`);
    }
  };

  const value = {
    user,
    session,
    isLoading: isLoading || (!!user && isAdminLoading),
    isAdmin: (isAdmin && !isImpersonating) || false,
    isImpersonating,
    signOut,
    impersonateUser,
    stopImpersonating,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};