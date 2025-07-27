import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const ForceAdminReset = () => {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  const handleReset = async () => {
    setLoading(true);
    const toastId = toast.loading('Forcibly resetting admin account...');

    try {
      const { data, error } = await supabase.functions.invoke('force-reset-admin');

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success('Admin account has been reset! You can now log in.', { id: toastId });
      setDone(true);

    } catch (error: any) {
      toast.error(`Reset failed: ${error.message}`, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Final Admin Account Reset</CardTitle>
          <CardDescription>
            This is the final step. Click the button below to reset the admin account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {done ? (
            <Button onClick={() => navigate('/admin/login')} className="w-full">Proceed to Login</Button>
          ) : (
            <Button onClick={handleReset} disabled={loading} className="w-full">
              {loading ? 'Processing...' : 'Reset Admin Account Now'}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ForceAdminReset;