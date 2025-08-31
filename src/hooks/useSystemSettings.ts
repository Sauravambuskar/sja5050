import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { SystemSettings } from '@/types/database';

const fetchSettings = async (): Promise<SystemSettings> => {
  const { data, error } = await supabase.from('system_settings').select('*').single();
  if (error) {
    console.error("Failed to fetch system settings:", error);
    // Return a default "safe" state if settings can't be fetched
    return { maintenance_mode_enabled: false, maintenance_message: null, updated_at: new Date().toISOString(), company_bank_details: null, auth_layout_image_url_1: null, auth_layout_image_url_2: null, splash_screen_url: null };
  }
  return data;
};

export const useSystemSettings = () => {
  const { data: settings, isLoading } = useQuery<SystemSettings>({
    queryKey: ['systemSettings'],
    queryFn: fetchSettings,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    settings,
    isLoading,
  };
};