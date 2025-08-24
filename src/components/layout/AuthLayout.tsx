import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const fetchSystemSettings = async () => {
  const { data, error } = await supabase.from('system_settings').select('*').single();
  if (error) {
    console.error('Error fetching system settings:', error);
    // Return a default object or null to avoid breaking the component
    return { auth_layout_image_url_1: null };
  }
  return data;
};

export const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  const { data: settings } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: fetchSystemSettings,
  });

  const imageUrl1 = settings?.auth_layout_image_url_1 || "/placeholder-image-1.jpg";

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto grid w-[350px] gap-6">
          {children}
        </div>
      </div>
      <div
        className="hidden lg:flex lg:items-center lg:justify-center bg-gray-100 dark:bg-gray-800 relative p-8"
        style={{
          backgroundImage: `url(${imageUrl1})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>
        <div className="relative z-10 w-full flex flex-col items-center justify-center">
          <img src="/logo.png" alt="SJA Micro Foundation Logo" className="w-auto h-48 object-contain" />
        </div>
      </div>
    </div>
  );
};