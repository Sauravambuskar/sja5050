import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Mail, Calendar, User, Gift, TrendingUp } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getImageFormat } from '@/lib/utils';

const FALLBACK_LOGO_URL = 'https://i.ibb.co/Jjq5fZbM/sja-pnggg.png';

const fetchWelcomeLetterData = async () => {
  const { data: profileData, error: profileError } = await supabase.rpc('get_my_profile');
  if (profileError) throw new Error(`Profile Error: ${profileError.message}`);

  const { data: settingsData, error: settingsError } = await supabase.from('system_settings').select('*').single();
  if (settingsError) throw new Error(`Settings Error: ${settingsError.message}`);

  return {
    profile: profileData[0],
    companyName: settingsData?.company_bank_details?.bank_name || 'SJA Foundation',
    joinDate: profileData[0]?.updated_at || new Date().toISOString(),
    logoUrl: settingsData?.login_page_logo_url || FALLBACK_LOGO_URL,
  };
};

export const WelcomeLetter = () => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['welcomeLetterData', user?.id],
    queryFn: fetchWelcomeLetterData,
    enabled: !!user?.id,
  });

  const handleDownloadWelcomeLetter = async () => {
    if (!data) return;

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const PAGE_W = doc.internal.pageSize.getWidth();
    const MARGIN = 48;
    const CONTENT_W = PAGE_W - MARGIN * 2;
    let y = MARGIN;

    const accent: [number, number, number] = [37, 99, 235];

    // ── Logo ──────────────────────────────────────────────────────────────
    const logoLoaded = await new Promise<HTMLImageElement | null>((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = data.logoUrl;
    });

    if (logoLoaded) {
      const logoH = 48;
      const logoW = (logoLoaded.width * logoH) / logoLoaded.height;
      const logoX = (PAGE_W - logoW) / 2;
      try {
        doc.addImage(logoLoaded, getImageFormat(data.logoUrl), logoX, y, logoW, logoH);
      } catch {
        // skip logo if embedding fails
      }
      y += logoH + 12;
    }

    // ── Header bar ────────────────────────────────────────────────────────
    doc.setFillColor(...accent);
    doc.rect(0, y, PAGE_W, 2, 'F');
    y += 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(...accent);
    doc.text('Welcome Letter', PAGE_W / 2, y + 20, { align: 'center' });
    y += 28;

    doc.setFontSize(13);
    doc.setTextColor(80, 80, 80);
    doc.text('SJA Foundation', PAGE_W / 2, y, { align: 'center' });
    y += 6;

    doc.setFillColor(...accent);
    doc.rect(0, y, PAGE_W, 2, 'F');
    y += 18;

    // ── Date ──────────────────────────────────────────────────────────────
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(`Date: ${format(new Date(), 'MMMM dd, yyyy')}`, PAGE_W - MARGIN, y, { align: 'right' });
    y += 18;

    // ── Salutation ────────────────────────────────────────────────────────
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(30, 30, 30);
    doc.text(`Dear ${data.profile.full_name || 'Valued Member'},`, MARGIN, y);
    y += 18;

    // ── Opening paragraph ─────────────────────────────────────────────────
    const openingLines = doc.splitTextToSize(
      "We are delighted to have you as a member of our investment community. Your trust in us means everything, and we're committed to helping you achieve your financial goals.",
      CONTENT_W
    );
    doc.text(openingLines, MARGIN, y);
    y += openingLines.length * 16 + 12;

    // ── Membership details table ──────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...accent);
    doc.text('Your Membership Details', MARGIN, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [['Field', 'Details']],
      body: [
        ['Member ID', data.profile.member_id || 'N/A'],
        ['Full Name', data.profile.full_name || 'N/A'],
        ['Email', user?.email || 'N/A'],
        ['Phone', data.profile.phone || 'N/A'],
        ['Join Date', format(new Date(data.joinDate), 'MMMM dd, yyyy')],
        ['Referral Code', data.profile.referral_code || 'N/A'],
      ],
      theme: 'striped',
      headStyles: { fillColor: accent },
      styles: { fontSize: 11 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 120 } },
    });

    y = (doc as any).lastAutoTable.finalY + 18;

    // ── Benefits section ──────────────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...accent);
    doc.text('Your Member Benefits', MARGIN, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      body: [
        ['Investment Plans', 'Access to exclusive investment opportunities with competitive returns.'],
        ['Referral Program', 'Earn commissions by referring friends and family using your unique code.'],
        ['Dashboard Access', 'Track your earnings and investments in real-time via your personal dashboard.'],
      ],
      theme: 'grid',
      styles: { fontSize: 11 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 120 } },
    });

    y = (doc as any).lastAutoTable.finalY + 18;

    // ── Closing ───────────────────────────────────────────────────────────
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(30, 30, 30);
    const closingLines = doc.splitTextToSize(
      "We wish you success in your investment journey with us! Our team is here to support you every step of the way. If you have any questions or need assistance, please don't hesitate to reach out.",
      CONTENT_W
    );
    doc.text(closingLines, MARGIN, y);
    y += closingLines.length * 16 + 16;

    doc.text('Warm regards,', MARGIN, y);
    y += 14;
    doc.setFont('helvetica', 'bold');
    doc.text('SJA Team', MARGIN, y);

    // ── Footer bar ────────────────────────────────────────────────────────
    const PAGE_H = doc.internal.pageSize.getHeight();
    doc.setFillColor(...accent);
    doc.rect(0, PAGE_H - 28, PAGE_W, 28, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text('sjamicrofoundation.com', PAGE_W / 2, PAGE_H - 10, { align: 'center' });

    doc.save(`Welcome-Letter-${data.profile.member_id || 'Member'}.pdf`);
  };

  if (isLoading) {
    return (
      <Card className="border-2">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            Welcome Letter
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card className="border-2 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b-2 border-blue-100">
        <CardTitle className="flex items-center gap-3 text-blue-900">
          <Mail className="h-6 w-6 text-blue-600" />
          Welcome Letter
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-8 space-y-6">
        {/* Header Section */}
        <div className="text-center bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
          <h1 className="text-3xl font-bold text-blue-900 mb-2">Welcome to SJA Foundation!</h1>
          <p className="text-blue-700 text-lg">Your Investment Journey Begins Here</p>
        </div>

        {/* Personal Greeting */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <User className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-800">Dear {data.profile.full_name || 'Valued Member'},</h2>
          </div>
          <p className="text-gray-700 leading-relaxed">
            We are delighted to have you as a member of our investment community. Your trust in us means everything, 
            and we're committed to helping you achieve your financial goals.
          </p>
        </div>

        {/* Member Details Card */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg p-6 border-2 border-blue-200">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-900">Your Membership Details</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Member ID</p>
              <p className="text-lg font-bold text-blue-900">{data.profile.member_id || 'N/A'}</p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Join Date</p>
              <p className="text-lg font-bold text-blue-900">{format(new Date(data.joinDate), 'MMMM dd, yyyy')}</p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Email</p>
              <p className="text-lg font-bold text-blue-900">{user?.email || 'N/A'}</p>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <p className="text-sm text-gray-600 mb-1">Phone</p>
              <p className="text-lg font-bold text-blue-900">{data.profile.phone || 'N/A'}</p>
            </div>
          </div>
        </div>

        <Separator />

        {/* Referral Code Section */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-6 border-2 border-green-200">
          <div className="flex items-center gap-3 mb-4">
            <Gift className="h-5 w-5 text-green-600" />
            <h3 className="text-lg font-semibold text-green-900">Your Referral Code</h3>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-600 mb-2">Share this code with friends and family to earn referral commissions:</p>
            <div className="flex items-center gap-3">
              <Badge variant="default" className="text-lg px-4 py-2 bg-green-600 hover:bg-green-700">
                {data.profile.referral_code || 'N/A'}
              </Badge>
              <span className="text-sm text-gray-500">Earn commissions for every successful referral!</span>
            </div>
          </div>
        </div>

        {/* Benefits Section */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-800">Your Member Benefits</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <h4 className="font-semibold text-blue-900 mb-2">Investment Plans</h4>
              <p className="text-sm text-blue-700">Access to exclusive investment opportunities</p>
            </div>

            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <Gift className="h-6 w-6 text-white" />
              </div>
              <h4 className="font-semibold text-green-900 mb-2">Referral Program</h4>
              <p className="text-sm text-green-700">Earn commissions by referring others</p>
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <User className="h-6 w-6 text-white" />
              </div>
              <h4 className="font-semibold text-purple-900 mb-2">Dashboard Access</h4>
              <p className="text-sm text-purple-700">Track earnings and investments in real-time</p>
            </div>
          </div>
        </div>

        {/* Closing Message */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
          <p className="text-gray-700 leading-relaxed text-center">
            We wish you success in your investment journey with us! Our team is here to support you every step of the way. 
            If you have any questions or need assistance, please don't hesitate to reach out.
          </p>
          <div className="text-center mt-4">
            <p className="text-blue-900 font-semibold">Wish You All the best !</p>
            <p className="text-blue-800">Regards,</p>
            <p className="text-blue-800">SJA Team</p>
          </div>
        </div>

        {/* Download Button */}
        <div className="flex justify-center pt-6 border-t border-gray-200">
          <Button onClick={handleDownloadWelcomeLetter} className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200">
            <Download className="h-5 w-5" />
            Download Welcome Letter
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};