import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { QRCodeCanvas } from 'qrcode.react';
import { toast } from 'sonner';
import { Download, Phone, ShieldCheck, Mail, Calendar } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { Profile, IdCardSettings } from '@/types/database';
import { format } from 'date-fns';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import { renderIdCardToPdfBlob } from '@/lib/idCardExport';
import { generateQrPngDataUrl } from '@/lib/qrDataUrl';

const fetchIdCardData = async () => {
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
  const [isDownloading, setIsDownloading] = useState(false);
  const [embeddedAvatarUrl, setEmbeddedAvatarUrl] = useState<string | undefined>(undefined);
  const [embeddedLogoUrl, setEmbeddedLogoUrl] = useState<string | undefined>(undefined);
  const [embeddedBgUrl, setEmbeddedBgUrl] = useState<string | undefined>(undefined);
  const [embeddedQrUrl, setEmbeddedQrUrl] = useState<string | undefined>(undefined);

  const { data, isLoading } = useQuery({
    queryKey: ['idCardData', user?.id],
    queryFn: fetchIdCardData,
    enabled: !!user,
  });

  const sanitizeUrl = (url?: string | null) => {
    if (!url) return undefined;
    try {
      const u = new URL(url, window.location.origin);
      if (u.protocol === 'http:') u.protocol = 'https:';
      return u.toString();
    } catch {
      return url.replace(/^http:\/\//, 'https://');
    }
  };

  const isLikelyCorsSafeFallback = (url?: string) => {
    if (!url) return false;
    if (url.startsWith('data:') || url.startsWith('blob:')) return true;
    if (url.includes('.supabase.co/storage/')) return true;
    return false;
  };

  const urlToDataUrl = async (url?: string) => {
    if (!url) return undefined;
    try {
      const res = await fetch(url, { mode: 'cors', cache: 'no-store' });
      if (!res.ok) return undefined;
      const blob = await res.blob();
      return await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('Failed to read image'));
        reader.readAsDataURL(blob);
      });
    } catch {
      return undefined;
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const referralLink = data?.profile.referral_code
    ? `${window.location.origin}/register?ref=${data.profile.referral_code}`
    : "";

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const avatarUrl = sanitizeUrl(user?.user_metadata?.avatar_url);
      const logoUrl = sanitizeUrl(data?.settings.logo_url);
      const bgUrl = sanitizeUrl(data?.settings.background_image_url);

      const [avatarDataUrl, logoDataUrl, bgDataUrl, qrDataUrl] = await Promise.all([
        urlToDataUrl(avatarUrl),
        urlToDataUrl(logoUrl),
        urlToDataUrl(bgUrl),
        referralLink
          ? generateQrPngDataUrl({ value: referralLink, size: 256, level: 'M' }).catch(() => undefined)
          : Promise.resolve(undefined),
      ]);

      if (cancelled) return;

      setEmbeddedAvatarUrl(avatarDataUrl || (isLikelyCorsSafeFallback(avatarUrl) ? avatarUrl : undefined));
      setEmbeddedLogoUrl(logoDataUrl);
      setEmbeddedBgUrl(bgDataUrl);
      setEmbeddedQrUrl(qrDataUrl);
    };

    if (user && data) run();

    return () => {
      cancelled = true;
    };
  }, [user, data, referralLink]);

  const handleDownloadPdf = async () => {
    if (!data?.profile.member_id) {
      toast.error("Member ID not available");
      return;
    }

    setIsDownloading(true);

    try {
      const memberSinceLabel = user?.created_at ? format(new Date(user.created_at), 'MMM yyyy') : 'N/A';
      const pdfBlob = await renderIdCardToPdfBlob({
        profile: data.profile,
        settings: data.settings,
        email: user?.email,
        memberSinceLabel,
        avatarDataUrl: embeddedAvatarUrl,
        logoDataUrl: embeddedLogoUrl,
        backgroundDataUrl: embeddedBgUrl,
        qrDataUrl: embeddedQrUrl,
      });

      const url = URL.createObjectURL(pdfBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SJA-Member-ID-${data.profile.member_id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("ID Card downloaded as PDF!");
    } catch (err) {
      console.error('PDF Download error:', err);
      toast.error(`Download failed: ${err instanceof Error ? err.message : 'Unable to generate ID card PDF'}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const cardStyle = {
    backgroundImage: embeddedBgUrl ? `url(${embeddedBgUrl})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {isLoading ? (
        <Skeleton className="h-[280px] w-full max-w-[380px] rounded-xl" />
      ) : (
        <div className="w-full max-w-[380px] mx-auto rounded-xl bg-card shadow-lg overflow-hidden font-sans relative" style={cardStyle}>
          {data?.settings.background_image_url && (
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
          )}
          <div className="relative z-10">
            {/* Header */}
            <div style={{ backgroundColor: data?.settings.accent_color }} className="h-24 relative flex items-center justify-between px-6 min-w-0">
              {embeddedLogoUrl ? (
                <img src={embeddedLogoUrl} alt="Company Logo" className="h-14 shrink-0" crossOrigin="anonymous" />
              ) : (
                <div className="w-14 h-14 shrink-0"></div>
              )}
              <h1 className="text-2xl font-bold text-white text-right leading-tight min-w-0 max-w-[220px] truncate">
                {data?.settings.company_name}
              </h1>
            </div>

            {/* Body */}
            <div className="relative bg-card/80 p-6 pb-4">
              <Avatar className="h-28 w-28 absolute -top-14 left-6 border-4 border-card">
                <AvatarImage src={embeddedAvatarUrl} crossOrigin="anonymous" />
                <AvatarFallback className="text-4xl">{getInitials(data?.profile.full_name)}</AvatarFallback>
              </Avatar>

              <div className="mt-14">
                <h2 className="text-3xl font-bold text-primary">{data?.profile.full_name}</h2>
                <p className="text-sm text-muted-foreground">
                  Member ID: <span className="font-semibold text-foreground">{data?.profile.member_id}</span>
                </p>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <div className="flex items-center gap-2 truncate">
                  <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{data?.profile.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 truncate">
                  <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{user?.email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 truncate">
                  <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{data?.profile.dob ? format(new Date(data.profile.dob), 'PPP') : 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 truncate">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span>
                    KYC:{' '}
                    <Badge variant={data?.profile.kyc_status === 'Approved' ? 'default' : 'secondary'}>
                      {data?.profile.kyc_status}
                    </Badge>
                  </span>
                </div>
              </div>

              <div className="mt-4 flex justify-between items-end gap-4">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Member Since</p>
                  <p className="font-semibold truncate">{user?.created_at ? format(new Date(user.created_at), 'MMMM yyyy') : 'N/A'}</p>
                </div>
                <div className="bg-white p-1.5 rounded-md shadow-md shrink-0">
                  {embeddedQrUrl ? (
                    <img src={embeddedQrUrl} alt="Referral QR" className="h-[72px] w-[72px]" />
                  ) : (
                    referralLink && <QRCodeCanvas value={referralLink} size={72} />
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ backgroundColor: data?.settings.accent_color }} className="px-6 py-2 text-center text-xs text-white font-semibold">
              sjamicrofoundation.com
            </div>
          </div>
        </div>
      )}
      <Button onClick={handleDownloadPdf} disabled={isLoading || isDownloading}>
        <Download className="mr-2 h-4 w-4" />
        {isDownloading ? 'Downloading PDF...' : 'Download ID Card (PDF)'}
      </Button>
    </div>
  );
};