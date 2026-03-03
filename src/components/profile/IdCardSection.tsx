import { useRef, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { QRCodeCanvas } from 'qrcode.react';
import { toast } from 'sonner';
import { Download, CreditCard, User, FileDown } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Profile, IdCardSettings } from '@/types/database';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { renderIdCardToPdfBlob, renderIdCardToPngDataUrl } from '@/lib/idCardExport';
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

export const IdCardSection = () => {
  const { user } = useAuth();
  const idCardRef = useRef<HTMLDivElement>(null);
  const [pngLoading, setPngLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const [embeddedAvatarUrl, setEmbeddedAvatarUrl] = useState<string | undefined>(undefined);
  const [embeddedLogoUrl, setEmbeddedLogoUrl] = useState<string | undefined>(undefined);
  const [embeddedBgUrl, setEmbeddedBgUrl] = useState<string | undefined>(undefined);
  const [embeddedQrUrl, setEmbeddedQrUrl] = useState<string | undefined>(undefined);

  const getErrorMessage = (err: unknown) => {
    if (err instanceof Error) return err.message;
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  };

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

  const { data, isLoading } = useQuery({
    queryKey: ['idCardData', user?.id],
    queryFn: () => fetchIdCardData(),
    enabled: !!user,
  });

  const referralLink = data?.profile.referral_code ? `${window.location.origin}/register?ref=${data.profile.referral_code}` : "";

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

      setEmbeddedAvatarUrl(avatarDataUrl);
      setEmbeddedLogoUrl(logoDataUrl);
      setEmbeddedBgUrl(bgDataUrl);
      setEmbeddedQrUrl(qrDataUrl);
    };

    if (user && data) run();

    return () => {
      cancelled = true;
    };
  }, [user, data, referralLink]);

  const handleDownloadPng = async () => {
    if (!data) return;
    setPngLoading(true);
    try {
      const memberSinceLabel = user?.created_at ? format(new Date(user.created_at), 'MMM yyyy') : 'N/A';
      const png = await renderIdCardToPngDataUrl({
        profile: data.profile,
        settings: data.settings,
        email: user?.email,
        memberSinceLabel,
        avatarDataUrl: embeddedAvatarUrl,
        logoDataUrl: embeddedLogoUrl,
        backgroundDataUrl: embeddedBgUrl,
        qrDataUrl: embeddedQrUrl,
      });

      const link = document.createElement('a');
      link.download = `SJA-Member-ID-${data.profile.member_id}.png`;
      link.href = png;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('ID Card downloaded successfully!');
    } catch (err) {
      toast.error(`Download failed: ${getErrorMessage(err)}`);
    } finally {
      setPngLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!data) return;
    setPdfLoading(true);
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
      toast.success('PDF downloaded successfully!');
    } catch (err) {
      toast.error(`PDF download failed: ${getErrorMessage(err)}`);
    } finally {
      setPdfLoading(false);
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const cardStyle = {
    backgroundImage: data?.settings.background_image_url ? `url(${sanitizeUrl(data.settings.background_image_url)})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Member ID Card</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Member ID Card</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col items-center gap-4">
          {/* Preview (UI only) */}
          <div ref={idCardRef} className="w-full max-w-[300px] mx-auto rounded-lg bg-card shadow-md overflow-hidden font-sans relative" style={cardStyle}>
            {data?.settings.background_image_url && (
              <div data-export-ignore="true" className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
            )}
            <div className="relative z-10">
              <div style={{ backgroundColor: data?.settings.accent_color }} className="h-16 relative flex items-center justify-between px-4 min-w-0">
                {data?.settings.logo_url ? (
                  <img src={sanitizeUrl(data.settings.logo_url)} alt="Company Logo" className="h-10 shrink-0" crossOrigin="anonymous" />
                ) : (
                  <div className="w-10 h-10 shrink-0"></div>
                )}
                <h1 className="text-lg font-bold text-white text-right leading-tight min-w-0 max-w-[170px] truncate">
                  {data?.settings.company_name}
                </h1>
              </div>

              <div className="relative bg-card/80 p-4 pb-2">
                <Avatar className="h-20 w-20 absolute -top-10 left-4 border-2 border-card">
                  <AvatarImage src={sanitizeUrl(user?.user_metadata?.avatar_url)} crossOrigin="anonymous" />
                  <AvatarFallback className="text-2xl">{getInitials(data?.profile.full_name)}</AvatarFallback>
                </Avatar>

                <div className="mt-10">
                  <h2 className="text-xl font-bold text-primary">{data?.profile.full_name}</h2>
                  <p className="text-xs text-muted-foreground">Member ID: <span className="font-semibold text-foreground">{data?.profile.member_id}</span></p>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                  <div className="flex items-center gap-1 truncate">
                    <User className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span className="truncate">{data?.profile.phone || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-1 truncate">
                    <CreditCard className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                    <span>
                      KYC:{' '}
                      <Badge variant={data?.profile.kyc_status === 'Approved' ? 'default' : 'secondary'} className="text-xs">
                        {data?.profile.kyc_status}
                      </Badge>
                    </span>
                  </div>
                </div>

                <div className="mt-2 flex justify-between items-end gap-3">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Member Since</p>
                    <p className="font-semibold text-xs">{user?.created_at ? format(new Date(user.created_at), 'MMM yyyy') : 'N/A'}</p>
                  </div>
                  <div className="bg-white p-1 rounded">
                    {embeddedQrUrl ? (
                      <img src={embeddedQrUrl} alt="Referral QR" className="h-12 w-12" />
                    ) : (
                      referralLink && <QRCodeCanvas value={referralLink} size={48} />
                    )}
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: data?.settings.accent_color }} className="py-2 text-center text-xs text-white font-semibold">
                sjamicrofoundation.com
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2">
            <Button onClick={handleDownloadPng} disabled={pngLoading} className="w-full">
              <Download className="mr-2 h-4 w-4" />
              {pngLoading ? 'Generating…' : 'Download PNG'}
            </Button>
            <Button onClick={handleDownloadPdf} disabled={pdfLoading} variant="outline" className="w-full">
              <FileDown className="mr-2 h-4 w-4" />
              {pdfLoading ? 'Generating…' : 'Download PDF'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};