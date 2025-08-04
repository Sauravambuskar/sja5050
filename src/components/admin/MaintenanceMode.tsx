import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { Loader2, Wrench } from 'lucide-react';
import { SystemSettings } from '@/types/database';
import { useEffect } from 'react';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';

const settingsSchema = z.object({
  maintenance_mode_enabled: z.boolean(),
  maintenance_message: z.string().optional().nullable(),
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

export const MaintenanceMode = () => {
  const queryClient = useQueryClient();
  const form = useForm<SettingsFormValues>({ resolver: zodResolver(settingsSchema) });

  const { data: settings, isLoading } = useQuery({
    queryKey: ['systemSettings'],
    queryFn: fetchSettings,
  });

  useEffect(() => {
    if (settings) {
      form.reset(settings);
    }
  }, [settings, form]);

  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (_, variables) => {
      toast.success(`Maintenance mode has been ${variables.maintenance_mode_enabled ? 'enabled' : 'disabled'}.`);
      queryClient.invalidateQueries({ queryKey: ['systemSettings'] });
    },
    onError: (error) => { toast.error(`Update failed: ${error.message}`); },
  });

  const onSubmit = (values: SettingsFormValues) => mutation.mutate(values);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Maintenance Mode</CardTitle>
        <CardDescription>Temporarily disable user access to the site for maintenance. Admins will still have full access.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="maintenance_mode_enabled" render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Enable Maintenance Mode</FormLabel>
                    <FormDescription>When enabled, non-admin users will see a maintenance page.</FormDescription>
                  </div>
                  <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                </FormItem>
              )} />
              <FormField control={form.control} name="maintenance_message" render={({ field }) => (
                <FormItem>
                  <FormLabel>Maintenance Message</FormLabel>
                  <FormControl><Textarea placeholder="e.g., We are currently performing scheduled maintenance. We will be back online shortly." {...field} value={field.value ?? ''} /></FormControl>
                </FormItem>
              )} />
              {settings?.maintenance_mode_enabled && (
                <Alert variant="destructive">
                  <Wrench className="h-4 w-4" />
                  <AlertDescription>
                    Maintenance mode is currently active.
                  </AlertDescription>
                </Alert>
              )}
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