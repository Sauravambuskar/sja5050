import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isImpersonating: boolean;
  impersonateUser: (userId: string) => Promise<void>;
  stopImpersonating: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_SESSION_KEY = 'supabase.admin-session';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);

      const adminSessionStr = localStorage.getItem(ADMIN_SESSION_KEY);
      if (adminSessionStr) {
        setIsImpersonating(true);
      }

      setLoading(false);
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const impersonateUser = async (userId: string) => {
    const currentSession = session;
    if (!currentSession) {
      toast.error("You must be logged in to impersonate a user.");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('admin-impersonate-user', {
        body: { userId },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      // Store the admin session
      localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify(currentSession));
      setIsImpersonating(true);

      // Set the new user session
      const { error: sessionError } = await supabase.auth.setSession(data);
      if (sessionError) throw sessionError;

      toast.success(`Now viewing as user ${userId}.`);
      // A full page reload ensures all components re-fetch data with the new user identity
      window.location.reload();

    } catch (err: any) {
      toast.error(`Impersonation failed: ${err.message}`);
    }
  };

  const stopImpersonating = async () => {
    const adminSessionStr = localStorage.getItem(ADMIN_SESSION_KEY);
    if (!adminSessionStr) {
      toast.error("No admin session found to return to.");
      return;
    }

    try {
      const adminSession = JSON.parse(adminSessionStr);
      const { error } = await supabase.auth.setSession(adminSession);
      if (error) throw error;

      localStorage.removeItem(ADMIN_SESSION_KEY);
      setIsImpersonating(false);
      toast.success("Returned to your admin session.");
      window.location.reload();

    } catch (err: any) {
      toast.error(`Failed to stop impersonating: ${err.message}`);
    }
  };

  const value = {
    session,
    user,
    loading,
    isImpersonating,
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