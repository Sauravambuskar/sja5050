import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Loader2 } from 'lucide-react';
import { Banner } from '@/hooks/useBanners';
import { useState } from 'react';

const formSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().optional(),
  link_to: z.string().optional(),
  is_active: z.boolean(),
  image: z.any().optional(),
});

type BannerFormValues = z.infer<typeof formSchema>;

interface BannerFormProps {
  banner?: Banner | null;
  onSuccess: () => void;
}

const uploadBannerImage = async (file: File) => {
  const fileName = `${Date.now()}-${file.name}`;
  const { data, error } = await supabase.storage
    .from('banners')
    .upload(fileName, file);
  if (error) throw new Error(`Image upload failed: ${error.message}`);
  
  const { data: urlData } = supabase.storage.from('banners').getPublicUrl(data.path);
  return urlData.publicUrl;
};

export function BannerForm({ banner, onSuccess }: BannerFormProps) {
  const queryClient = useQueryClient();
  const [imagePreview, setImagePreview] = useState<string | null>(banner?.image_url || null);
  const form = useForm<BannerFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: banner?.title || '',
      description: banner?.description || '',
      link_to: banner?.link_to || '',
      is_active: banner?.is_active ?? true,
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: BannerFormValues) => {
      let imageUrl = banner?.image_url;

      if (values.image && values.image.length > 0) {
        imageUrl = await uploadBannerImage(values.image[0]);
      }

      if (!imageUrl) {
        throw new Error('An image is required to create or update a banner.');
      }

      const dataToUpsert = {
        id: banner?.id,
        title: values.title,
        description: values.description,
        link_to: values.link_to,
        is_active: values.is_active,
        image_url: imageUrl,
      };

      const { error } = await supabase.from('banners').upsert(dataToUpsert, { onConflict: 'id' });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(`Banner ${banner ? 'updated' : 'created'} successfully!`);
      queryClient.invalidateQueries({ queryKey: ['bannersAdmin'] });
      queryClient.invalidateQueries({ queryKey: ['banners'] });
      onSuccess();
    },
    onError: (error) => {
      toast.error(`Failed: ${error.message}`);
    },
  });

  const onSubmit = (data: BannerFormValues) => {
    mutation.mutate(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Summer Sale" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea placeholder="A short description of the banner." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="link_to"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Link (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., /investments or https://example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="image"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Banner Image</FormLabel>
              <FormControl>
                <Input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={(e) => {
                    field.onChange(e.target.files);
                    if (e.target.files && e.target.files[0]) {
                      setImagePreview(URL.createObjectURL(e.target.files[0]));
                    }
                  }}
                />
              </FormControl>
              {imagePreview && <img src={imagePreview} alt="Preview" className="mt-4 h-32 w-auto object-contain rounded-md border" />}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel>Activate Banner</FormLabel>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
        <Button type="submit" disabled={mutation.isPending} className="w-full">
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {banner ? 'Save Changes' : 'Create Banner'}
        </Button>
      </form>
    </Form>
  );
}