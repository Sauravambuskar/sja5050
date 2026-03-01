import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { SystemSettings } from '@/types/database';

const fetchSettings = async (): Promise<SystemSettings> => {
  const { data, error } = await supabase.from('system_settings').select('*').single();
  if (error) {
    console.error("Failed to fetch system settings:", error);
    // Return a default "safe" state if settings can't be fetched
    return {
      id: 1,
      maintenance_mode_enabled: false,
      maintenance_message: null,
      updated_at: new Date().toISOString(),
      company_bank_details: null,
      auth_layout_image_url_1: null,
      auth_layout_image_url_2: null,
      login_page_logo_url: null,
      splash_screen_url: null,
      investment_agreement_text: null,
    };
  }
  return data;
};

export const useSystemSettings = () => {
  const { data: settings, isLoading } = useQuery<SystemSettings>({
    queryKey: ['systemSettings'],
    queryFn: fetchSettings,
    // Keep fresh so admin template updates reflect quickly on all pages.
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  return {
    settings,
    isLoading,
  };
};