import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { useEffect } from "react";
import { toast } from "sonner";

const AdminLogin = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // User has just signed in. Now, check if they are an admin.
        const { data: isAdmin, error } = await supabase.rpc('is_admin');

        if (error) {
          // If the RPC fails, log them out for safety.
          toast.error('Could not verify admin status. Please try again.');
          await supabase.auth.signOut();
          return;
        }

        if (isAdmin) {
          // They are an admin, redirect to the admin dashboard.
          toast.success('Welcome, Admin!');
          navigate('/admin');
        } else {
          // They are NOT an admin. Log them out immediately and show an error.
          toast.error('Access Denied. You do not have admin privileges.');
          await supabase.auth.signOut();
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  // Redirect if an admin is already logged in
  useEffect(() => {
    const checkExistingSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data: isAdmin } = await supabase.rpc('is_admin');
            if (isAdmin) {
                navigate('/admin');
            }
        }
    }
    checkExistingSession();
  }, [navigate]);

  return (
    <AuthLayout>
      <Card className="w-full max-w-sm border-0 shadow-none sm:border sm:shadow-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Admin Portal</CardTitle>
          <CardDescription>
            Please enter your administrator credentials.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={[]}
            theme="light"
            view="sign_in"
            showLinks={false}
          />
        </CardContent>
      </Card>
    </AuthLayout>
  );
};

export default AdminLogin;