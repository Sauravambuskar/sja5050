import React from 'react';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { Skeleton } from '../ui/skeleton';
import { Link } from 'react-router-dom';

const BRAND_LOGO_URL = "https://i.ibb.co/Jjq5fZbM/sja-pnggg.png";

export const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  const { settings, isLoading } = useSystemSettings();

  const imageUrl1 =
    settings?.auth_layout_image_url_1 ||
    "https://png.pngtree.com/background/20250107/original/pngtree-hands-holding-money-green-investment-wealth-growth-concept-picture-image_16144123.jpg";
  const imageUrl2 =
    settings?.auth_layout_image_url_2 ||
    "https://ideogram.ai/assets/progressive-image/balanced/response/N1ygBDjpR2Gu9OPylgNwoA";
  const logoUrl = settings?.login_page_logo_url || BRAND_LOGO_URL;

  return (
    <div className="light w-full min-h-screen bg-muted lg:grid lg:grid-cols-2">
      <div className="hidden lg:block">
        {isLoading ? (
          <Skeleton className="h-full w-full" />
        ) : (
          <img
            src={imageUrl1}
            alt="An abstract image representing finance and growth"
            className="h-full w-full object-cover"
          />
        )}
      </div>
      <div
        className="flex h-screen items-center justify-center p-6 lg:h-auto lg:bg-transparent"
        style={{
          backgroundImage: `url('${imageUrl2}')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="lg:hidden absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
        <div className="relative z-10 w-full max-w-md">
          {/* Logo Section */}
          <div className="mb-8 flex justify-center">
            {isLoading ? (
              <Skeleton className="h-16 w-32" />
            ) : (
              <img
                src={logoUrl}
                alt="SJA Lands Logo"
                title="SJA Lands Logo"
                loading="lazy"
                decoding="async"
                className="h-14 sm:h-16 md:h-20 w-auto max-w-[220px] object-contain drop-shadow-md"
              />
            )}
          </div>

          {children}

          <div className="mt-6 text-center text-xs text-muted-foreground">
            <Link className="underline" to="/privacy-policy">
              Privacy Policy
            </Link>
            <span className="mx-2">•</span>
            <Link className="underline" to="/terms">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};