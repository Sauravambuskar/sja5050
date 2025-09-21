import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { Profile } from '@/types/database';
import { toast } from 'sonner';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isImpersonating: boolean;
  impersonateUser: (userId: string) => Promise<void>;
  stopImpersonating: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  isImpersonating: false,
  impersonateUser: async () => {},
  stopImpersonating: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    // Safely check for impersonation state
    try {
      const savedSessionJson = localStorage.getItem('original_session');
      if (savedSessionJson && savedSessionJson !== 'undefined' && savedSessionJson !== 'null') {
        setIsImpersonating(true);
      }
    } catch (error) {
      console.warn('Error checking impersonation state:', error);
      localStorage.removeItem('original_session'); // Clear potentially corrupted data
    }

    const getSessionAndProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const { data: profileData, error: profileError } = await supabase.rpc('get_my_profile');
        if (profileError) {
          console.error('Error fetching profile:', profileError);
          setProfile(null);
        } else if (profileData) {
          setProfile(profileData[0] as Profile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    };

    getSessionAndProfile();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        const { data: profileData, error: profileError } = await supabase.rpc('get_my_profile');
        if (profileError) {
          console.error('Error fetching profile on auth change:', profileError);
          setProfile(null);
        } else if (profileData) {
          setProfile(profileData[0] as Profile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const impersonateUser = async (userId: string) => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession) {
      toast.error("You must be logged in to impersonate.");
      return;
    }

    toast.loading("Starting impersonation...");
    try {
      const { data, error } = await supabase.functions.invoke('impersonate-user', {
        body: { targetUserId: userId },
      });

      if (error || !data.session) {
        throw new Error(error?.message || 'Failed to get impersonation session.');
      }

      // Safely store the original session
      try {
        localStorage.setItem('original_session', JSON.stringify(currentSession));
      } catch (storageError) {
        console.error('Error storing original session:', storageError);
        toast.error("Failed to save original session. Impersonation might not work correctly.");
      }
      
      const { session: impersonatedSession } = data;
      await supabase.auth.setSession({
        access_token: impersonatedSession.access_token,
        refresh_token: impersonatedSession.refresh_token,
      });

      setIsImpersonating(true);
      toast.dismiss();
      toast.success("Now impersonating user. Reloading...");
      window.location.reload();
    } catch (e) {
      toast.dismiss();
      toast.error((e as Error).message);
      console.error(e);
    }
  };

  const stopImpersonating = async () => {
    const savedSessionJson = localStorage.getItem('original_session');
    if (savedSessionJson) {
      try {
        const savedSession = JSON.parse(savedSessionJson);
        await supabase.auth.setSession({
          access_token: savedSession.access_token,
          refresh_token: savedSession.refresh_token,
        });
        localStorage.removeItem('original_session');
        setIsImpersonating(false);
        toast.success("Stopped impersonating. Reloading...");
        window.location.reload();
      } catch (parseError) {
        console.error('Error parsing original session from localStorage:', parseError);
        toast.error("Failed to restore original session. Please log in again.");
        await supabase.auth.signOut();
      }
    } else {
      toast.error("No original session found. Signing out.");
      await supabase.auth.signOut();
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    isImpersonating,
    impersonateUser,
    stopImpersonating,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
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