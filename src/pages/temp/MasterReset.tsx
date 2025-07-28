import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';

const MasterReset = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleReset = async () => {
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
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Master Account Reset</CardTitle>
          <CardDescription>
            This is a final recovery tool. This will permanently delete the 'admin@sja.com' user if it exists, allowing you to re-register it cleanly.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button onClick={handleReset} disabled={loading} className="w-full">
            {loading ? 'Processing...' : 'Force Delete Admin Account'}
          </Button>
          {message && (
            <Alert className="mt-4">
              <Terminal className="h-4 w-4" />
              <AlertTitle>System Response</AlertTitle>
              <AlertDescription>
                {message}
              </AlertDescription>
            </Alert>
          )}
          {message.includes('SUCCESS') && (
             <Button onClick={() => navigate('/register')} className="w-full">Proceed to Registration</Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MasterReset;