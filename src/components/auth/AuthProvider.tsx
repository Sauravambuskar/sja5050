import { Session, SupabaseClient, User } from '@supabase/supabase-js';
import { useContext, useState, useEffect, createContext } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

type AuthContextType = {
  supabase: SupabaseClient;
  session: Session | null;
  user: User | null;
  loading: boolean;
  isImpersonating: boolean;
  impersonateUser: (userId: string) => void;
  revertImpersonation: () => void;
};

export const AuthContext = createContext<AuthContextType>({
  supabase: supabase,
  session: null,
  user: null,
  loading: true,
  isImpersonating: false,
  impersonateUser: () => {},
  revertImpersonation: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);
  const navigate = useNavigate();

  const impersonateUser = (userId: string) => {
    const currentSession = session;
    if (currentSession) {
      localStorage.setItem('admin_access_token', currentSession.access_token);
      localStorage.setItem('admin_refresh_token', currentSession.refresh_token);
      
      supabase.auth.signOut().then(() => {
        // This is a placeholder for a proper impersonation flow, which needs a backend function.
        // The current implementation will fail but the revert logic is what we're fixing.
        console.log(`Attempting to impersonate user ${userId}. This requires a backend setup.`);
        // For now, we just log out and let the user know.
        revertImpersonation();
      });
    }
  };

  const revertImpersonation = () => {
    const accessToken = localStorage.getItem('admin_access_token');
    const refreshToken = localStorage.getItem('admin_refresh_token');
    if (accessToken && refreshToken) {
      supabase.auth.signOut().then(() => {
        supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        }).then(({ error }) => {
          if (!error) {
            localStorage.removeItem('admin_access_token');
            localStorage.removeItem('admin_refresh_token');
            setIsImpersonating(false);
            navigate(0); // Refresh to apply new session
          } else {
            console.error("Failed to revert impersonation:", error);
            localStorage.removeItem('admin_access_token');
            localStorage.removeItem('admin_refresh_token');
            navigate('/login');
          }
        });
      });
    } else {
      supabase.auth.signOut();
      navigate('/login');
    }
  };

  useEffect(() => {
    setLoading(true);
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      const adminToken = localStorage.getItem('admin_access_token');
      if (adminToken) {
        setIsImpersonating(true);
      } else {
        setIsImpersonating(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    supabase,
    session,
    user,
    loading,
    isImpersonating,
    impersonateUser,
    revertImpersonation,
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