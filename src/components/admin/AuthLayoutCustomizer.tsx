import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Loader2, Upload, Image } from 'lucide-react';
import { SystemSettings } from '@/types/database';
import { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

const settingsSchema = z.object({
  auth_layout_image_url_1: z.string().url("Must be a valid URL.").optional().or(z.literal('')),
  auth_layout_image_url_2: z.string().url("Must be a valid URL.").optional().or(z.literal('')),
  login_page_logo_url: z.string().url("Must be a valid URL.").optional().or(z.literal('')),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const fetchSettings = async (): Promise<SystemSettings> => {
  const { data, error } = await supabase.from('system_settings').select('*').single();
  if (error) throw error;
  return data;
};

const updateSettings = async (values: SettingsFormValues) => {
  const { error } = await supabase.from('system_settings').update(values).eq('id', 1);
  if (error) throw error;
};

const uploadLogo = async (file: File): Promise<string> => {
  const fileName = `login-logo-${Date.now()}.${file.name.split('.').pop()}`;
  const { data, error } = await supabase.storage
    .from('system_assets')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('system_assets')
    .getPublicUrl(data.path);

  return publicUrl;
};

export const AuthLayoutCustomizer = () => {
  const queryClient = useQueryClient();
  const form = useForm<SettingsFormValues>({ resolver: zodResolver(settingsSchema) });
  const [isUploading, setIsUploading] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: fetchSettings,
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        auth_layout_image_url_1: settings.auth_layout_image_url_1 ?? '',
        auth_layout_image_url_2: settings.auth_layout_image_url_2 ?? '',
        login_page_logo_url: settings.login_page_logo_url ?? '',
      });
    }
  }, [settings, form]);

  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      toast.success("Auth page settings updated successfully!");
      queryClient.invalidateQueries({ queryKey: ['systemSettings'] });
    },
    onError: (error: Error) => { toast.error(`Update failed: ${error.message}`); },
  });

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setIsUploading(true);
    try {
      const publicUrl = await uploadLogo(file);
      form.setValue('login_page_logo_url', publicUrl);
      toast.success('Logo uploaded successfully!');
    } catch (error) {
      toast.error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      event.target.value = '';
    }
  };

  const onSubmit = (values: SettingsFormValues) => mutation.mutate(values);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Auth Page Customizer</CardTitle>
        <CardDescription>Customize the background images and logo on the login and registration pages.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Logo Upload Section */}
              <div className="space-y-4">
                <FormLabel>Login Page Logo</FormLabel>
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={form.watch('login_page_logo_url') || undefined} />
                    <AvatarFallback>
                      <Image className="h-8 w-8" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      id="logo-upload"
                      disabled={isUploading}
                    />
                    <label htmlFor="logo-upload">
                      <Button 
                        type="button" 
                        variant="outline" 
                        className="w-full cursor-pointer"
                        disabled={isUploading}
                        asChild
                      >
                        <span>
                          {isUploading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              Upload Logo
                            </>
                          )}
                        </span>
                      </Button>
                    </label>
                  </div>
                </div>
                <FormField control={form.control} name="login_page_logo_url" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Or enter logo URL</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} placeholder="https://example.com/logo.png" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <Separator />

              {/* Background Images Section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Background Images</h3>
                <FormField control={form.control} name="auth_layout_image_url_1" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Large Screen Image URL (Left Panel)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} placeholder="https://example.com/image1.jpg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="auth_layout_image_url_2" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mobile & Main Panel Background URL</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} placeholder="https://example.com/image2.jpg" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Auth Page Settings
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
};