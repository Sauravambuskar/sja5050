import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { QRCodeCanvas } from 'qrcode.react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import { Download, Phone, ShieldCheck, Mail, Calendar } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { Profile, IdCardSettings } from '@/types/database';
import { format } from 'date-fns';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';

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
  const idCardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['idCardData', user?.id],
    queryFn: fetchIdCardData,
    enabled: !!user,
  });

  const handleDownload = async () => {
    if (!idCardRef.current) {
      toast.error("ID card element not found");
      return;
    }

    if (!data?.profile.member_id) {
      toast.error("Member ID not available");
      return;
    }

    setIsDownloading(true);

    try {
      // Add a small delay to ensure the DOM is fully rendered
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Get the element and ensure it's visible
      const element = idCardRef.current;
      
      // Ensure the element is properly styled for export
      element.style.transform = 'scale(1)';
      element.style.transformOrigin = 'top left';
      
      // Create a canvas-friendly version
      const dataUrl = await toPng(element, { 
        cacheBust: true, 
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        width: 380,
        height: 280,
        quality: 0.95,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        }
      });
      
      if (!dataUrl) {
        throw new Error('Failed to generate image data');
      }
      
      // Create download link
      const link = document.createElement('a');
      link.download = `SJA-Member-ID-${data.profile.member_id}.png`;
      link.href = dataUrl;
      link.style.display = 'none';
      
      // Add to DOM, click, and remove
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
      }, 100);
      
      toast.success("ID Card downloaded successfully!");
    } catch (err) {
      console.error('Download error:', err);
      toast.error(`Download failed: ${err instanceof Error ? err.message : 'Unable to generate ID card image'}`);
      
      // Try alternative method using canvas
      try {
        toast.info("Trying alternative method...");
        await downloadWithCanvas();
      } catch (fallbackError) {
        console.error('Fallback download error:', fallbackError);
        toast.error("All download methods failed. Please try again or contact support.");
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const downloadWithCanvas = async () => {
    if (!idCardRef.current || !data?.profile.member_id) return;

    try {
      // Create a canvas element
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');

      // Set canvas dimensions
      canvas.width = 380;
      canvas.height = 280;

      // Get the element
      const element = idCardRef.current;
      
      // Use html-to-image with proper options
      const dataUrl = await toPng(element, {
        width: 380,
        height: 280,
        pixelRatio: 1,
        backgroundColor: '#ffffff'
      });

      if (!dataUrl) {
        throw new Error('Canvas method failed to generate image');
      }

      // Create and trigger download
      const link = document.createElement('a');
      link.download = `SJA-Member-ID-${data.profile.member_id}.png`;
      link.href = dataUrl;
      link.style.display = 'none';
      
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
      }, 100);
      
      toast.success("ID Card downloaded using alternative method!");
    } catch (canvasError) {
      console.error('Canvas method error:', canvasError);
      throw canvasError;
    }
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const referralLink = data?.profile.referral_code ? `${window.location.origin}/register?ref=${data.profile.referral_code}` : "";

  const cardStyle = {
    backgroundImage: data?.settings.background_image_url ? `url(${data.settings.background_image_url})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {isLoading ? (
        <Skeleton className="h-[280px] w-full max-w-[380px] rounded-xl" />
      ) : (
        <div ref={idCardRef} className="w-full max-w-[380px] mx-auto rounded-xl bg-card shadow-lg overflow-hidden font-sans relative" style={cardStyle}>
          {data?.settings.background_image_url && <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>}
          <div className="relative z-10">
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
            <div className="relative bg-card/80 p-6 pb-4">
              <Avatar className="h-28 w-28 absolute -top-14 left-6 border-4 border-card">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback className="text-4xl">{getInitials(data?.profile.full_name)}</AvatarFallback>
              </Avatar>
              
              <div className="mt-14">
                <h2 className="text-3xl font-bold text-primary">{data?.profile.full_name}</h2>
                <p className="text-sm text-muted-foreground">Member ID: <span className="font-semibold text-foreground">{data?.profile.member_id}</span></p>
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
        </div>
      )}
      <Button onClick={handleDownload} disabled={isLoading || isDownloading}>
        <Download className="mr-2 h-4 w-4" /> 
        {isDownloading ? 'Downloading...' : 'Download ID Card'}
      </Button>
    </div>
  );
};