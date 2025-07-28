import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthProvider";
import { useEffect, useState } from "react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";

function Login() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (session) {
      navigate("/");
    }
  }, [session, navigate]);

  const handleMasterReset = async () => {
    if (!window.confirm("Are you absolutely sure? This will permanently delete the 'admin@sja.com' user, allowing it to be re-registered.")) {
      return;
    }
    setLoading(true);
    setMessage('');
    const toastId = toast.loading('Executing master reset...');

    try {
      const { data, error } = await supabase.rpc('force_delete_admin_user');
      if (error) throw error;
      toast.success('Reset successful. You can now register.', { id: toastId });
      setMessage(data);
    } catch (error: any) {
      toast.error(`Reset failed: ${error.message}`, { id: toastId });
      setMessage(`An error occurred: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card className="w-full max-w-sm border-0 shadow-none sm:border sm:shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Login</CardTitle>
          <CardDescription>
            Enter your email below to login to your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={[]}
            theme="light"
            view="sign_in"
            redirectTo={`${window.location.origin}/`}
          />
          <div className="mt-4 text-center text-sm">
            Don't have an account?{" "}
            <Link to="/register" className="underline">
              Sign up
            </Link>
          </div>
          <div className="mt-2 text-center text-sm">
            <Link to="/forgot-password" className="underline">
              Forgot your password?
            </Link>
          </div>
          <div className="mt-6 border-t pt-4">
            <p className="text-center text-sm text-muted-foreground">If you are completely locked out of the admin account, use this final recovery tool.</p>
            <Button variant="destructive" className="w-full mt-2" onClick={handleMasterReset} disabled={loading}>
              {loading ? 'Processing...' : 'Master Reset Admin Account'}
            </Button>
            {message && (
              <Alert className="mt-4">
                <Terminal className="h-4 w-4" />
                <AlertTitle>System Response</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
            {message.includes('SUCCESS') && (
              <Button onClick={() => navigate('/register')} className="w-full mt-2">Proceed to Registration</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}

export default Login;