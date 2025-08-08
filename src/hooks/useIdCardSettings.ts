import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { IdCardSettings } from '@/types/database';

const fetchSettings = async (): Promise<IdCardSettings> => {
  const { data, error } = await supabase.from('id_card_settings').select('*').single();
  
  // If no settings row exists, create one with defaults
  if (error && error.code === 'PGRST116') {
    const { data: newSettings, error: insertError } = await supabase
      .from('id_card_settings')
      .insert({ id: 1 })
      .select()
      .single();
    if (insertError) throw insertError;
    return newSettings;
  }
  
  if (error) throw error;
  return data;
};

export const useIdCardSettings = () => {
  return useQuery<IdCardSettings>({
    queryKey: ['idCardSettings'],
    queryFn: fetchSettings,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};