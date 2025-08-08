import { useQueryClient, useMutation } from '@tanstack/react-query';
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
import { useEffect } from 'react';
import { useIdCardSettings } from '@/hooks/useIdCardSettings';

const settingsSchema = z.object({
  company_name: z.string().min(2, "Company name is required."),
  logo_file: z.instanceof(FileList).optional(),
  accent_color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color."),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

const updateSettings = async ({ values, current_logo_url }: { values: SettingsFormValues, current_logo_url?: string | null }) => {
  const { logo_file, ...otherValues } = values;
  let logoUrlToUpdate = current_logo_url;

  if (logo_file && logo_file.length > 0) {
    const file = logo_file[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `public/logo.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('system_assets')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (uploadError) throw new Error(`Logo upload failed: ${uploadError.message}`);

    const { data: urlData } = supabase.storage.from('system_assets').getPublicUrl(fileName);
    logoUrlToUpdate = `${urlData.publicUrl}?t=${new Date().getTime()}`;
  }

  const { error } = await supabase
    .from('id_card_settings')
    .update({ company_name: otherValues.company_name, accent_color: otherValues.accent_color, logo_url: logoUrlToUpdate })
    .eq('id', 1);

  if (error) throw error;
};

export const IdCardCustomizer = () => {
  const queryClient = useQueryClient();
  const form = useForm<SettingsFormValues>({ resolver: zodResolver(settingsSchema) });
  const logoFileRef = form.register("logo_file");

  const { data: settings, isLoading } = useIdCardSettings();

  useEffect(() => {
    if (settings) {
      form.reset({
        company_name: settings.company_name,
        accent_color: settings.accent_color,
      });
    }
  }, [settings, form]);

  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: () => {
      toast.success("Settings updated successfully!");
      queryClient.invalidateQueries({ queryKey: ['idCardSettings'] });
    },
    onError: (error) => { toast.error(`Update failed: ${error.message}`); },
  });

  const onSubmit = (values: SettingsFormValues) => {
    mutation.mutate({ values, current_logo_url: settings?.logo_url });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branding & ID Card</CardTitle>
        <CardDescription>Customize the company logo, name, and ID card appearance.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="company_name" render={({ field }) => (<FormItem><FormLabel>Company Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
              
              <FormField control={form.control} name="logo_file" render={() => (
                <FormItem>
                  <FormLabel>Company Logo</FormLabel>
                  <FormControl><Input type="file" accept="image/png, image/jpeg, image/svg+xml" {...logoFileRef} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              {settings?.logo_url && (
                <div>
                  <p className="text-sm text-muted-foreground">Current Logo:</p>
                  <img src={settings.logo_url} alt="Current Logo" className="h-16 mt-2 border p-2 rounded-md bg-muted" />
                </div>
              )}

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