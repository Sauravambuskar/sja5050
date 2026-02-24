import { useRef, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { QRCodeCanvas } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import { Download, CreditCard, User, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import { useAuth } from '@/components/auth/AuthProvider';
import { Profile, IdCardSettings } from '@/types/database';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import QRCode from 'qrcode';

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
  const [pdfLoading, setPdfLoading] = useState(false);
  const [embeddedAvatarUrl, setEmbeddedAvatarUrl] = useState<string | undefined>(undefined);
  const [embeddedLogoUrl, setEmbeddedLogoUrl] = useState<string | undefined>(undefined);
  const [embeddedBgUrl, setEmbeddedBgUrl] = useState<string | undefined>(undefined);
  const [embeddedQrUrl, setEmbeddedQrUrl] = useState<string | undefined>(undefined);

  // Helper to produce human-readable error messages
  const getErrorMessage = (err: unknown) => {
    if (err instanceof Error) return err.message;
    if (err instanceof Event) {
      return 'Download failed because one of the images (photo/logo/background) could not be loaded for export. Please use images hosted on Supabase Storage (or any CORS-enabled URL), then try again.';
    }
    try {
      return JSON.stringify(err);
    } catch {
      return String(err);
    }
  };

  // Ensure external image URLs use HTTPS to avoid mixed content
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
    // Supabase public storage URLs are typically CORS-enabled
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

  const ensureImagesLoaded = async () => {
    if (!idCardRef.current) return;
    const imgs = Array.from(idCardRef.current.querySelectorAll('img'));
    await Promise.all(
      imgs.map(
        (img) =>
          new Promise<void>((resolve) => {
            if (img.complete) return resolve();
            img.onload = () => resolve();
            img.onerror = () => resolve();
          })
      )
    );
  };

  const captureCardAsPng = async (pixelRatio = 3) => {
    if (!idCardRef.current) throw new Error('Card not ready');
    await ensureImagesLoaded();

    const baseOpts = {
      pixelRatio,
      backgroundColor: '#ffffff',
      fetchRequestInit: { cache: 'no-store' } as RequestInit,
      // backdrop-filter often breaks foreignObject rendering; ignore the blur overlay
      filter: (node: Node) => {
        if (!(node instanceof HTMLElement)) return true;
        return node.getAttribute('data-export-ignore') !== 'true';
      },
    };

    try {
      return await toPng(idCardRef.current, baseOpts);
    } catch {
      const el = idCardRef.current;

      // Attempt 2: remove background image and try again
      const prevBg = el.style.backgroundImage;
      el.style.backgroundImage = 'none';
      try {
        return await toPng(el, baseOpts);
      } finally {
        el.style.backgroundImage = prevBg;
      }
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
          ? QRCode.toDataURL(referralLink, {
              margin: 0,
              width: 256,
              errorCorrectionLevel: 'M',
              color: { dark: '#000000', light: '#ffffff' },
            }).catch(() => undefined)
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

  const handleDownload = async () => {
    if (!idCardRef.current) return;
    try {
      const dataUrl = await captureCardAsPng(2);
      const link = document.createElement('a');
      link.download = `SJA-Member-ID-${data?.profile.member_id}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("ID Card downloaded successfully!");
    } catch (err) {
      toast.error(`Download failed: ${getErrorMessage(err)}`);
    }
  };

  const handleDownloadPdf = async () => {
    if (!idCardRef.current) return;
    setPdfLoading(true);
    try {
      const dataUrl = await captureCardAsPng(3);

      const img = new Image();
      img.src = dataUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image for PDF'));
      });

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;
      const availableWidth = pageWidth - margin * 2;

      const imgWidth = img.width;
      const imgHeight = img.height;
      const drawHeight = (availableWidth * imgHeight) / imgWidth;

      const x = margin;
      const y = Math.max(margin, (pageHeight - drawHeight) / 2);

      doc.addImage(dataUrl, 'PNG', x, y, availableWidth, drawHeight);
      const filename = `SJA-Member-ID-${data?.profile.member_id}.pdf`;
      doc.save(filename);

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
    backgroundImage: embeddedBgUrl ? `url(${embeddedBgUrl})` : 'none',
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
          {/* Mini ID Card Preview */}
          <div ref={idCardRef} className="w-full max-w-[300px] mx-auto rounded-lg bg-card shadow-md overflow-hidden font-sans relative" style={cardStyle}>
            {data?.settings.background_image_url && (
              <div data-export-ignore="true" className="absolute inset-0 bg-black/20 backdrop-blur-sm" />
            )}
            <div className="relative z-10">
              {/* Header */}
              <div style={{ backgroundColor: data?.settings.accent_color }} className="h-16 relative flex items-center justify-between px-4">
                {embeddedLogoUrl ? (
                  <img src={embeddedLogoUrl} alt="Company Logo" className="h-10" crossOrigin="anonymous" />
                ) : (
                  <div className="w-10 h-10"></div>
                )}
                <h1 className="text-lg font-bold text-white text-right leading-tight">{data?.settings.company_name}</h1>
              </div>

              {/* Body */}
              <div className="relative bg-card/80 p-4 pb-2">
                <Avatar className="h-20 w-20 absolute -top-10 left-4 border-2 border-card">
                  <AvatarImage src={embeddedAvatarUrl} crossOrigin="anonymous" />
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
                      <Badge
                        variant={data?.profile.kyc_status === 'Approved' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {data?.profile.kyc_status}
                      </Badge>
                    </span>
                  </div>
                </div>

                <div className="mt-2 flex justify-between items-end">
                  <div>
                    <p className="text-xs text-muted-foreground">Member Since</p>
                    <p className="font-semibold text-xs">{user?.created_at ? format(new Date(user.created_at), 'MMM yyyy') : 'N/A'}</p>
                  </div>
                  <div data-qr="true" className="bg-white p-1 rounded shadow-sm">
                    {embeddedQrUrl ? (
                      <img src={embeddedQrUrl} alt="Referral QR" className="h-12 w-12" />
                    ) : (
                      referralLink && <QRCodeCanvas value={referralLink} size={48} />
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ backgroundColor: data?.settings.accent_color }} className="px-4 py-1 text-center text-xs text-white font-semibold">
                sjamicrofoundation.com
              </div>
            </div>
          </div>

          {/* Download Buttons */}
          <div className="flex items-center gap-2">
            <Button onClick={handleDownload} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download ID Card
            </Button>
            <Button variant="secondary" onClick={handleDownloadPdf} loading={pdfLoading} className="flex items-center gap-2">
              <FileDown className="h-4 w-4" />
              Download PDF
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};