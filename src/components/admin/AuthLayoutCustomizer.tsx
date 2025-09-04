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
import { Loader2 } from 'lucide-react';
import { SystemSettings } from '@/types/database';
import { useEffect } from 'react';

const settingsSchema = z.object({
  auth_layout_image_url_1: z.string().url("Must be a valid URL.").optional().or(z.literal('')),
  auth_layout_image_url_2: z.string().url("Must be a valid URL.").optional().or(z.literal('')),
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

export const AuthLayoutCustomizer = () => {
  const queryClient = useQueryClient();
  const form = useForm<SettingsFormValues>({ resolver: zodResolver(settingsSchema) });

  const { data: settings, isLoading } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: fetchSettings,
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        auth_layout_image_url_1: settings.auth_layout_image_url_1 ?? '',
        auth_layout_image_url_2: settings.auth_layout_image_url_2 ?? '',
      });
    }
  }, [settings, form]);

  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      toast.success("Auth page settings updated successfully!");
      queryClient.invalidateQueries({ queryKey: ['systemSettings'] });
    },
    onError: (error) => { toast.error(`Update failed: ${error.message}`); },
  });

  const onSubmit = (values: SettingsFormValues) => mutation.mutate(values);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Auth Page Customizer</CardTitle>
        <CardDescription>Customize the background images on the login and registration pages.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="auth_layout_image_url_1" render={({ field }) => (<FormItem><FormLabel>Large Screen Image URL (Left Panel)</FormLabel><FormControl><Input {...field} value={field.value ?? ''} placeholder="https://example.com/image1.jpg" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="auth_layout_image_url_2" render={({ field }) => (<FormItem><FormLabel>Mobile & Main Panel Background URL</FormLabel><FormControl><Input {...field} value={field.value ?? ''} placeholder="https://example.com/image2.jpg" /></FormControl><FormMessage /></FormItem>)} />
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