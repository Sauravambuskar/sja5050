import { Auth } from "@supabase/auth-ui-react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { useEffect } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { customAuthTheme } from "@/lib/auth-theme";

function UpdatePassword() {
  const navigate = useNavigate();
  const { session } = useAuth();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // This event is triggered after the user clicks the password recovery link.
        // The view will automatically be 'update_password'.
      }
      if (event === 'USER_UPDATED') {
        // This event is triggered after the password has been successfully updated.
        setTimeout(() => navigate('/'), 2000);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (session) {
    return (
      <AuthLayout>
        <div className="text-center">
          <p>You are already logged in. Redirecting to dashboard...</p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <Card className="w-full max-w-sm border-0 shadow-none sm:border sm:shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Update Password</CardTitle>
          <CardDescription>
            Enter your new password below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: customAuthTheme }}
            providers={[]}
            view="update_password"
            showLinks={false}
          />
        </CardContent>
      </Card>
    </AuthLayout>
  );
}

export default UpdatePassword;