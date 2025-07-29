import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const LoginMfa = () => {
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const { data: factorsData, error: factorsError } = await supabase.auth.mfa.listFactors();

    if (factorsError) {
      toast.error(factorsError.message);
      setIsLoading(false);
      navigate('/login');
      return;
    }

    const totpFactor = factorsData.totp.find(f => f.status === 'verified');

    if (!totpFactor) {
        toast.error("Could not find an MFA factor to verify. Please try logging in again.");
        setIsLoading(false);
        navigate('/login');
        return;
    }

    const { error } = await supabase.auth.mfa.challengeAndVerify({
      factorId: totpFactor.id,
      code,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Successfully signed in!');
      navigate('/');
    }
    setIsLoading(false);
  };

  return (
    <AuthLayout>
      <Card className="w-full max-w-sm border-0 shadow-none sm:border sm:shadow-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Two-Factor Verification</CardTitle>
          <CardDescription>
            Enter the code from your authenticator app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-6">
            <div className="flex justify-center">
              <InputOTP maxLength={6} value={code} onChange={setCode}>
                <InputOTPGroup>
                  <InputOTPSlot index={0} />
                  <InputOTPSlot index={1} />
                  <InputOTPSlot index={2} />
                  <InputOTPSlot index={3} />
                  <InputOTPSlot index={4} />
                  <InputOTPSlot index={5} />
                </InputOTPGroup>
              </InputOTP>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading || code.length < 6}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify
            </Button>
          </form>
        </CardContent>
      </Card>
    </AuthLayout>
  );
};

export default LoginMfa;