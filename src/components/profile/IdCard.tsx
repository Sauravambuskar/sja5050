import { useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { QRCodeCanvas } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import { Download, Loader2 } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { Profile, IdCardSettings } from '@/types/database';
import { format } from 'date-fns';
import { Skeleton } from '../ui/skeleton';

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
        <Skeleton className="h-[220px] w-[350px] rounded-xl" />
      ) : (
        <div ref={idCardRef} className="w-[350px] rounded-xl bg-card shadow-lg overflow-hidden font-sans">
          <div style={{ backgroundColor: data?.settings.accent_color }} className="h-20 relative flex items-center justify-between px-4">
            {data?.settings.logo_url ? (
              <img src={data.settings.logo_url} alt="Company Logo" className="h-12" />
            ) : (
              <div className="w-12 h-12"></div>
            )}
            <h1 className="text-xl font-bold text-white">{data?.settings.company_name}</h1>
          </div>
          <div className="relative bg-card p-4 pb-6">
            <Avatar className="h-24 w-24 absolute -top-12 left-4 border-4 border-card">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="text-3xl">{getInitials(data?.profile.full_name)}</AvatarFallback>
            </Avatar>
            <div className="mt-12">
              <h2 className="text-2xl font-bold text-primary">{data?.profile.full_name}</h2>
              <p className="text-sm text-muted-foreground">Member ID: <span className="font-semibold text-foreground">{data?.profile.member_id}</span></p>
            </div>
            <div className="mt-4 flex justify-between items-end">
              <div>
                <p className="text-xs text-muted-foreground">Member Since</p>
                <p className="font-semibold">{user?.created_at ? format(new Date(user.created_at), 'MMMM yyyy') : 'N/A'}</p>
              </div>
              <div className="bg-white p-1 rounded-md">
                {referralLink && <QRCodeCanvas value={referralLink} size={64} />}
              </div>
            </div>
          </div>
        </div>
      )}
      <Button onClick={handleDownload} disabled={isLoading}>
        <Download className="mr-2 h-4 w-4" /> Download ID Card
      </Button>
    </div>
  );
};