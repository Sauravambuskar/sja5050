import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export interface Banner {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  link_to: string | null;
  is_active: boolean;
  created_at: string;
}

const fetchBanners = async (): Promise<Banner[]> => {
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (error) {
    toast.error('Failed to load banners.');
    console.error('Banner fetch error:', error);
    throw new Error(error.message);
  }
  return data;
};

export const useBanners = () => {
  return useQuery<Banner[], Error>({
    queryKey: ['banners'],
    queryFn: fetchBanners,
  });
};