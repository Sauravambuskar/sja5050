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
  splash_screen_url: z.string().url("Must be a valid URL.").optional().or(z.literal('')),
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

export const SplashScreenCustomizer = () => {
  const queryClient = useQueryClient();
  const form = useForm<SettingsFormValues>({ resolver: zodResolver(settingsSchema) });

  const { data: settings, isLoading } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: fetchSettings,
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        splash_screen_url: settings.splash_screen_url ?? '',
      });
    }
  }, [settings, form]);

  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      toast.success("Splash screen settings updated successfully!");
      queryClient.invalidateQueries({ queryKey: ['systemSettings'] });
    },
    onError: (error) => { toast.error(`Update failed: ${error.message}`); },
  });

  const onSubmit = (values: SettingsFormValues) => mutation.mutate(values);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Splash Screen Customizer</CardTitle>
        <CardDescription>Customize the loading screen image that users see when they first open the app.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="splash_screen_url" render={({ field }) => (<FormItem><FormLabel>Splash Screen Image URL</FormLabel><FormControl><Input {...field} value={field.value ?? ''} placeholder="https://example.com/splash.jpg" /></FormControl><FormMessage /></FormItem>)} />
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Splash Screen
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
};