import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Mail } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { format } from 'date-fns';
import { exportToPdf } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

const fetchWelcomeLetterData = async () => {
  const { data: profileData, error: profileError } = await supabase.rpc('get_my_profile');
  if (profileError) throw new Error(`Profile Error: ${profileError.message}`);
  
  const { data: settingsData, error: settingsError } = await supabase.from('system_settings').select('*').single();
  if (settingsError) throw new Error(`Settings Error: ${settingsError.message}`);
  
  return { 
    profile: profileData[0], 
    companyName: settingsData?.company_bank_details?.bank_name || 'SJA Foundation',
    joinDate: profileData[0]?.updated_at || new Date().toISOString()
  };
};

export const WelcomeLetter = () => {
  const { user } = useAuth();
  
  const { data, isLoading } = useQuery({
    queryKey: ['welcomeLetterData', user?.id],
    queryFn: fetchWelcomeLetterData,
    enabled: !!user?.id,
  });

  const handleDownloadWelcomeLetter = () => {
    if (!data) return;

    const headers = ['Field', 'Details'];
    const letterData = [
      ['Member Name', data.profile.full_name || 'N/A'],
      ['Member ID', data.profile.member_id || 'N/A'],
      ['Join Date', format(new Date(data.joinDate), 'MMMM dd, yyyy')],
      ['Email', user?.email || 'N/A'],
      ['Phone', data.profile.phone || 'N/A'],
      ['Referral Code', data.profile.referral_code || 'N/A'],
    ];

    exportToPdf(
      `Welcome-Letter-${data.profile.member_id || 'Member'}.pdf`,
      'Welcome Letter',
      headers,
      letterData,
      data.profile.full_name || 'Member'
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Welcome Letter</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome Letter</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="prose prose-sm max-w-none">
          <p className="text-lg font-semibold">Dear {data.profile.full_name || 'Valued Member'},</p>
          <p>
            Welcome to {data.companyName}! We are delighted to have you as a member of our investment community.
          </p>
          <p>
            Your membership has been successfully created with Member ID: <strong>{data.profile.member_id || 'N/A'}</strong>.
            You joined us on <strong>{format(new Date(data.joinDate), 'MMMM dd, yyyy')}</strong>.
          </p>
          <p>
            As a member, you now have access to our investment plans, referral program, and comprehensive dashboard
            to track your earnings and investments.
          </p>
          <p>
            Your unique referral code is: <strong>{data.profile.referral_code || 'N/A'}</strong>. Share this with
            friends and family to earn referral commissions.
          </p>
          <p>
            We wish you success in your investment journey with us!
          </p>
          <p className="mt-6">
            Best regards,<br />
            The {data.companyName} Team
          </p>
        </div>
        
        <div className="flex gap-2 pt-4">
          <Button onClick={handleDownloadWelcomeLetter} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Download Welcome Letter
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};