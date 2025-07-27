import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const AdminLogin = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const { data: isAdmin, error } = await supabase.rpc('is_admin');
        if (error) {
          toast.error('Could not verify admin status. Please try again.');
          await supabase.auth.signOut();
          return;
        }
        if (isAdmin) {
          toast.success('Welcome, Admin!');
          navigate('/admin');
        } else {
          toast.error('Access Denied. You do not have admin privileges.');
          await supabase.auth.signOut();
        }
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleForceReset = async () => {
    if (!window.confirm("Are you sure? This will permanently delete and recreate the admin@sja.com user with the default password.")) {
      return;
    }
    setLoading(true);
    const toastId = toast.loading('Forcibly resetting admin account...');
    try {
      const { data, error } = await supabase.functions.invoke('force-reset-admin');
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      toast.success('Admin account has been reset! You can now log in with the default credentials.', { id: toastId, duration: 10000 });
    } catch (error: any) {
      toast.error(`Reset failed: ${error.message}`, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

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
          <div className="mt-4 border-t pt-4">
            <p className="text-center text-sm text-muted-foreground">If you are completely locked out, you can force reset the primary admin account.</p>
            <Button variant="destructive" className="w-full mt-2" onClick={handleForceReset} disabled={loading}>
              {loading ? 'Resetting...' : 'Force Admin Reset'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </AuthLayout>
  );
};

export default AdminLogin;