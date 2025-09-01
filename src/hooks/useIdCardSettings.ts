import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { IdCardSettings } from '@/types/database';

const fetchSettings = async (): Promise<IdCardSettings> => {
  const { data, error } = await supabase.from('id_card_settings').select('*').single();
  if (error) {
    console.error("Failed to fetch ID card settings:", error);
    // Return a default state if settings can't be fetched
    return { 
      id: 1, 
      company_name: 'SJA Foundation', 
      logo_url: null, 
      accent_color: '#2563eb', 
      background_image_url: null,
      updated_at: new Date().toISOString() 
    };
  }
  return data;
};

export const useIdCardSettings = () => {
  const { data: settings, isLoading } = useQuery<IdCardSettings>({
    queryKey: ['idCardSettings'],
    queryFn: fetchSettings,
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  return {
    settings,
    isLoading,
  };
};