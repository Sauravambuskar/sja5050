import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { SystemSettings } from '@/types/database';

const fetchSettings = async (): Promise<SystemSettings> => {
  const { data, error } = await supabase.from('system_settings').select('*').single();
  if (error) {
    console.error("Failed to fetch system settings:", error);
    // Return a default "safe" state if settings can't be fetched
    return { id: 1, maintenance_mode_enabled: false, maintenance_message: null, updated_at: new Date().toISOString() };
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