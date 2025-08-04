import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { QRCodeCanvas } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import { Download, Loader2, Phone, ShieldCheck } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { Profile, IdCardSettings } from '@/types/database';
import { format } from 'date-fns';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';

const fetchIdCardData = async (userId: string) => {
  const profilePromise = supabase.rpc('get_my_profile');
  const settingsPromise = supabase.from('id_card_settings').select('*').single();
  const { data: profileData, error: profileError } = await profilePromise;
  if (profileError) throw new Error(`Profile Error: ${profileError.message}`);
  const { data: settingsData, error: settingsError } = await settingsPromise;
  if (settingsError) throw new Error(`Settings Error: ${settingsError.message}`);
  return { profile: profileData[0] as Profile, settings: settingsData as IdCardSettings };
};

export const IdCard = () => {
  const { user } = useAuth();
  const idCardRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['idCardData', user?.id],
    queryFn: () => fetchIdCardData(user!.id),
    enabled: !!user,
  });

  const handleDownload = () => {
    if (!idCardRef.current) return;
    toPng(idCardRef.current, { cacheBust: true, pixelRatio: 2 })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.download = `SJA-Member-ID-${data?.profile.member_id}.png`;
        link.href = dataUrl;
        link.click();
        toast.success("ID Card downloaded successfully!");
      })
      .catch((err) => {
        toast.error(`Download failed: ${err.message}`);
      });
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const referralLink = data?.profile.referral_code ? `${window.location.origin}/register?ref=${data.profile.referral_code}` : "";

  return (
    <div className="flex flex-col items-center gap-6">
      {isLoading ? (
        <Skeleton className="h-[280px] w-[380px] rounded-xl" />
      ) : (
        <div ref={idCardRef} className="w-[380px] rounded-xl bg-card shadow-lg overflow-hidden font-sans">
          {/* Header */}
          <div style={{ backgroundColor: data?.settings.accent_color }} className="h-24 relative flex items-center justify-between px-6">
            {data?.settings.logo_url ? (
              <img src={data.settings.logo_url} alt="Company Logo" className="h-14" />
            ) : (
              <div className="w-14 h-14"></div>
            )}
            <h1 className="text-2xl font-bold text-white text-right leading-tight">{data?.settings.company_name}</h1>
          </div>
          
          {/* Body */}
          <div className="relative bg-card p-6 pb-4">
            <Avatar className="h-28 w-28 absolute -top-14 left-6 border-4 border-card">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="text-4xl">{getInitials(data?.profile.full_name)}</AvatarFallback>
            </Avatar>
            
            <div className="mt-14">
              <h2 className="text-3xl font-bold text-primary">{data?.profile.full_name}</h2>
              <p className="text-sm text-muted-foreground">Member ID: <span className="font-semibold text-foreground">{data?.profile.member_id}</span></p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{data?.profile.phone || 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                <span>KYC: <Badge variant={data?.profile.kyc_status === 'Approved' ? 'default' : 'secondary'}>{data?.profile.kyc_status}</Badge></span>
              </div>
            </div>
            
            <div className="mt-4 flex justify-between items-end">
              <div>
                <p className="text-xs text-muted-foreground">Member Since</p>
                <p className="font-semibold">{user?.created_at ? format(new Date(user.created_at), 'MMMM yyyy') : 'N/A'}</p>
              </div>
              <div className="bg-white p-1.5 rounded-md shadow-md">
                {referralLink && <QRCodeCanvas value={referralLink} size={72} />}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div style={{ backgroundColor: data?.settings.accent_color }} className="px-6 py-2 text-center text-xs text-white font-semibold">
            http://sjamicrofoundation.com/
          </div>
        </div>
      )}
      <Button onClick={handleDownload} disabled={isLoading}>
        <Download className="mr-2 h-4 w-4" /> Download ID Card
      </Button>
    </div>
  );
};