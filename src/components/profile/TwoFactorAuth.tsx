import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck, ShieldOff } from 'lucide-react';
import { toast } from 'sonner';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { QRCodeCanvas } from 'qrcode.react';
import { Alert, AlertDescription } from '@/components/ui/alert';

type Factor = {
  id: string;
  status: 'verified' | 'unverified';
};

const listFactors = async () => {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  return data;
};

const TwoFactorAuth = () => {
  const queryClient = useQueryClient();
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
  const [isDisableDialogOpen, setIsDisableDialogOpen] = useState(false);
  const [enrollData, setEnrollData] = useState<{ uri: string; secret: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState('');

  const { data: factorsResponse, isLoading, refetch } = useQuery({
    queryKey: ['mfaFactors'],
    queryFn: listFactors,
  });

  const totpFactor = factorsResponse?.totp[0] as Factor | undefined;

  const enrollMutation = useMutation({
    mutationFn: () => supabase.auth.mfa.enroll({ factorType: 'totp' }),
    onSuccess: (data) => {
      if (data.error) throw data.error;
      setEnrollData({
        uri: data.data.totp.uri,
        secret: data.data.totp.secret,
      });
      setIsEnrollDialogOpen(true);
    },
    onError: (error) => toast.error(`Failed to start 2FA enrollment: ${error.message}`),
  });

  const verifyMutation = useMutation({
    mutationFn: async (code: string) => {
      if (!totpFactor) throw new Error('No factor to verify.');
      const challenge = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
      if (challenge.error) throw challenge.error;
      const verify = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challenge.data.id,
        code,
      });
      if (verify.error) throw verify.error;
    },
    onSuccess: () => {
      toast.success('2FA enabled successfully!');
      setIsEnrollDialogOpen(false);
      setVerifyCode('');
      refetch();
    },
    onError: (error) => toast.error(`Verification failed: ${error.message}`),
  });

  const unenrollMutation = useMutation({
    mutationFn: () => {
      if (!totpFactor) throw new Error('No factor to disable.');
      return supabase.auth.mfa.unenroll({ factorId: totpFactor.id });
    },
    onSuccess: (data) => {
      if (data.error) throw data.error;
      toast.success('2FA disabled successfully.');
      queryClient.invalidateQueries({ queryKey: ['mfaFactors'] });
    },
    onError: (error) => toast.error(`Failed to disable 2FA: ${error.message}`),
    onSettled: () => setIsDisableDialogOpen(false),
  });

  const handleVerify = () => {
    if (verifyCode.length !== 6) {
      toast.error('Please enter a 6-digit code.');
      return;
    }
    verifyMutation.mutate(verifyCode);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Two-Factor Authentication (2FA)</CardTitle>
          <CardDescription>
            Add an additional layer of security to your account by requiring a second verification step.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : totpFactor?.status === 'verified' ? (
            <div className="flex items-center justify-between rounded-lg border bg-green-50 p-4 dark:bg-green-900/20">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-6 w-6 text-green-600" />
                <p className="font-semibold text-green-800 dark:text-green-200">2FA is Enabled</p>
              </div>
              <Button variant="destructive" onClick={() => setIsDisableDialogOpen(true)}>Disable</Button>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="flex items-center gap-3">
                <ShieldOff className="h-6 w-6 text-muted-foreground" />
                <p className="font-semibold">2FA is Disabled</p>
              </div>
              <Button onClick={() => enrollMutation.mutate()} disabled={enrollMutation.isPending}>
                {enrollMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Enable
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enroll Dialog */}
      <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable Two-Factor Authentication</DialogTitle>
            <DialogDescription>Scan the QR code with your authenticator app, then enter the code to verify.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-6 py-4">
            {enrollData?.uri && <QRCodeCanvas value={enrollData.uri} size={200} />}
            <Alert>
              <AlertDescription>
                Can't scan? Manually enter this code: <br />
                <strong className="font-mono">{enrollData?.secret}</strong>
              </AlertDescription>
            </Alert>
            <Input
              placeholder="Enter 6-digit code"
              value={verifyCode}
              onChange={(e) => setVerifyCode(e.target.value)}
              maxLength={6}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEnrollDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleVerify} disabled={verifyMutation.isPending}>
              {verifyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify & Enable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disable Dialog */}
      <AlertDialog open={isDisableDialogOpen} onOpenChange={setIsDisableDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to disable 2FA?</AlertDialogTitle>
            <AlertDialogDescription>
              Disabling 2FA will reduce your account's security. We strongly recommend keeping it enabled.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => unenrollMutation.mutate()} disabled={unenrollMutation.isPending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {unenrollMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Yes, Disable 2FA
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default TwoFactorAuth;