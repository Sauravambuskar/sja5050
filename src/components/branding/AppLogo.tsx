import { cn } from "@/lib/utils";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { Skeleton } from "@/components/ui/skeleton";

const FALLBACK_LOGO_URL = "https://i.ibb.co/Jjq5fZbM/sja-pnggg.png";

type AppLogoProps = {
  className?: string;
  alt?: string;
};

export function AppLogo({ className, alt = "App logo" }: AppLogoProps) {
  const { settings, isLoading } = useSystemSettings();
  const logoUrl = settings?.login_page_logo_url || FALLBACK_LOGO_URL;

  if (isLoading) {
    return <Skeleton className={cn("h-8 w-28", className)} />;
  }

  return (
    <img
      src={logoUrl}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={cn("h-8 w-auto max-w-[160px] object-contain", className)}
    />
  );
}
