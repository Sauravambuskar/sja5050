import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Copy } from 'lucide-react';

const FinalAdminCreation = () => {
  const [loading, setLoading] = useState(false);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);
  const navigate = useNavigate();

  const handleCreateAdmin = async () => {
    setLoading(true);
    setCredentials(null);
    const toastId = toast.loading('Creating a new, clean admin account...');

    try {
      const { data, error } = await supabase.functions.invoke('create-new-admin');

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success('New admin account created! Use the credentials below to log in.', { id: toastId, duration: 10000 });
      setCredentials({ email: data.email, password: data.password });

    } catch (error: any) {
      toast.error(`Creation failed: ${error.message}`, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Final Admin Account Creation</CardTitle>
          <CardDescription>
            This is the final recovery tool. This will create a brand new, clean admin account with a random email and password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleCreateAdmin} disabled={loading} className="w-full">
            {loading ? 'Processing...' : 'Create New Admin Account'}
          </Button>
          {credentials && (
            <Alert className="mt-4">
              <Terminal className="h-4 w-4" />
              <AlertTitle>Your New Admin Credentials</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>Use these credentials to log in at the `/admin/login` page. Store them securely.</p>
                <div className="flex items-center justify-between rounded-md bg-muted p-2">
                  <span className="font-mono text-sm">{credentials.email}</span>
                  <Button variant="ghost" size="icon" onClick={() => copyToClipboard(credentials.email)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex items-center justify-between rounded-md bg-muted p-2">
                  <span className="font-mono text-sm">{credentials.password}</span>
                   <Button variant="ghost" size="icon" onClick={() => copyToClipboard(credentials.password)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button onClick={() => navigate('/admin/login')} className="w-full mt-4">Proceed to Admin Login</Button>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FinalAdminCreation;