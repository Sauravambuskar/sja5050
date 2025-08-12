import { Auth } from "@supabase/auth-ui-react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { customAuthTheme } from "@/lib/auth-theme";

function ForgotPassword() {
  return (
    <AuthLayout>
      <Card className="w-full max-w-sm border-0 shadow-none sm:border sm:shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Forgot Password</CardTitle>
          <CardDescription>
            Enter your email and we'll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: customAuthTheme }}
            providers={[]}
            view="forgotten_password"
            redirectTo={`${window.location.origin}/`}
            showLinks={false}
          />
          <div className="mt-4 text-center text-sm">
            Remember your password?{" "}
            <Link to="/login" className="underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}

export default ForgotPassword;