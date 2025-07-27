import { useState }from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const SetupAdmin = () => {
  const [email, setEmail] = useState('admin@sja.com');
  const [password, setPassword] = useState('Saurav$581');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSetup = async () => {
    setLoading(true);
    const toastId = toast.loading('Setting up admin account...');

    try {
      const { data, error } = await supabase.functions.invoke('setup-admin-account', {
        body: { email, password },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success('Admin account configured successfully! Redirecting to login...', { id: toastId });
      setTimeout(() => navigate('/admin/login'), 2000);

    } catch (error: any) {
      toast.error(`Setup failed: ${error.message}`, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>One-Time Admin Setup</CardTitle>
          <CardDescription>
            Use this page to create or reset the primary administrator account.
            This page will be removed after use.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Admin Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Admin Password</Label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button onClick={handleSetup} disabled={loading} className="w-full">
            {loading ? 'Processing...' : 'Create/Reset Admin Account'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SetupAdmin;