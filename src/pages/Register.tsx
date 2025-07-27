import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import { AuthLayout } from "@/components/layout/AuthLayout";

function Register() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [searchParams] = useSearchParams();
  const referralCodeFromUrl = searchParams.get('ref');

  useEffect(() => {
    if (session) {
      navigate("/");
    }
  }, [session, navigate]);

  return (
    <AuthLayout>
      <Card className="w-full max-w-sm border-0 shadow-none sm:border sm:shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Sign Up</CardTitle>
          <CardDescription>
            Create your account to start investing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={[]}
            theme="light"
            view="sign_up"
            redirectTo={`${window.location.origin}/`}
            showLinks={false}
            additionalData={{
              full_name: '',
              referral_code: referralCodeFromUrl || '',
            }}
            formOptions={{
              shouldCreateUser: true,
            }}
            localization={{
              variables: {
                sign_up: {
                  email_label: 'Email address',
                  password_label: 'Create a Password',
                  button_label: 'Sign up',
                  // @ts-ignore
                  full_name_label: 'Full Name',
                  full_name_placeholder: 'Enter your full name',
                  referral_code_label: 'Referral Code (Optional)',
                  referral_code_placeholder: 'Enter referral code',
                },
              },
            }}
          />
          <div className="mt-4 text-center text-sm">
            Already have an account?{" "}
            <Link to="/login" className="underline">
              Sign in
            </Link>
          </div>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}

export default Register;