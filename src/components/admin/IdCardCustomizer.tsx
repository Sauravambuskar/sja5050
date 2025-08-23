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
import { IdCardSettings } from '@/types/database';
import { useEffect } from 'react';

const settingsSchema = z.object({
  company_name: z.string().min(2, "Company name is required."),
  logo_url: z.string().url("Must be a valid URL.").optional().or(z.literal('')),
  accent_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color."),
  background_image_url: z.string().url("Must be a valid URL.").optional().or(z.literal('')),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const fetchSettings = async (): Promise<IdCardSettings> => {
  const { data, error } = await supabase.from('id_card_settings').select('*').single();
  if (error) throw error;
  return data;
};

const updateSettings = async (values: SettingsFormValues) => {
  const { error } = await supabase.from('id_card_settings').update(values).eq('id', 1);
  if (error) throw error;
};

export const IdCardCustomizer = () => {
  const queryClient = useQueryClient();
  const form = useForm<SettingsFormValues>({ resolver: zodResolver(settingsSchema) });

  const { data: settings, isLoading } = useQuery({
    queryKey: ['idCardSettings'],
    queryFn: fetchSettings,
  });

  useEffect(() => {
    if (settings) {
      form.reset(settings);
    }
  }, [settings, form]);

  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      toast.success("ID Card settings updated successfully!");
      queryClient.invalidateQueries({ queryKey: ['idCardSettings'] });
      queryClient.invalidateQueries({ queryKey: ['idCardData'] }); // Invalidate user-facing card
    },
    onError: (error) => { toast.error(`Update failed: ${error.message}`); },
  });

  const onSubmit = (values: SettingsFormValues) => mutation.mutate(values);

  return (
    <Card>
      <CardHeader>
        <CardTitle>ID Card Customizer</CardTitle>
        <CardDescription>Customize the appearance of the member ID cards. Changes will apply to all users.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="company_name" render={({ field }) => (<FormItem><FormLabel>Company Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="logo_url" render={({ field }) => (<FormItem><FormLabel>Logo URL</FormLabel><FormControl><Input {...field} value={field.value ?? ''} placeholder="https://example.com/logo.png" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="background_image_url" render={({ field }) => (<FormItem><FormLabel>Background Image URL</FormLabel><FormControl><Input {...field} value={field.value ?? ''} placeholder="https://example.com/background.png" /></FormControl><FormMessage /></FormItem>)} />
              <FormField control={form.control} name="accent_color" render={({ field }) => (<FormItem><FormLabel>Accent Color (Hex)</FormLabel><div className="flex items-center gap-2"><FormControl><Input {...field} className="w-32" /></FormControl><div className="w-8 h-8 rounded-md border" style={{ backgroundColor: field.value }}></div></div><FormMessage /></FormItem>)} />
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Settings
              </Button>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
};