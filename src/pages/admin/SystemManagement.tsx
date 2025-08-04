import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2, PlayCircle, Send } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BroadcastHistory } from "@/components/admin/BroadcastHistory";

const triggerMaturityProcessing = async () => {
  const { data, error } = await supabase.functions.invoke('admin-trigger-maturities');
  if (error) throw new Error(error.message);
  if (data.error) throw new Error(data.error);
  return data;
};

const broadcastSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters."),
  description: z.string().min(10, "Description must be at least 10 characters."),
});

type BroadcastFormValues = z.infer<typeof broadcastSchema>;

const sendBroadcast = async (values: BroadcastFormValues) => {
  const { data, error } = await supabase.functions.invoke('admin-send-broadcast', { body: values });
  if (error) throw new Error(error.message);
  if (data.error) throw new Error(data.error);
  return data;
};

const SystemManagement = () => {
  const [isConfirmMaturityOpen, setIsConfirmMaturityOpen] = useState(false);
  const [broadcastToConfirm, setBroadcastToConfirm] = useState<BroadcastFormValues | null>(null);
  const form = useForm<BroadcastFormValues>({ resolver: zodResolver(broadcastSchema) });

  const maturityMutation = useMutation({
    mutationFn: triggerMaturityProcessing,
    onSuccess: (data) => { toast.success("Maturity processing complete.", { description: data.message }); },
    onError: (error) => { toast.error(`Processing failed: ${error.message}`); },
    onSettled: () => { setIsConfirmMaturityOpen(false); },
  });

  const broadcastMutation = useMutation({
    mutationFn: sendBroadcast,
    onSuccess: (data) => {
      toast.success("Broadcast sent successfully!", { description: data.message });
      form.reset();
    },
    onError: (error) => { toast.error(`Broadcast failed: ${error.message}`); },
    onSettled: () => { setBroadcastToConfirm(null); },
  });

  const onBroadcastSubmit = (values: BroadcastFormValues) => {
    setBroadcastToConfirm(values);
  };

  return (
    <>
      <h1 className="text-3xl font-bold">System Management</h1>
      <p className="text-muted-foreground">Manually trigger system-wide jobs and processes.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Investment Maturity Processing</CardTitle>
            <CardDescription>
              This job finds all active investments that have reached their maturity date, calculates the final payout, credits the user's wallet, and updates the investment status to 'Matured'. This process normally runs automatically once per day.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setIsConfirmMaturityOpen(true)} disabled={maturityMutation.isPending}>
              {maturityMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
              Run Manually
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Broadcast Notification</CardTitle>
            <CardDescription>
              Send a notification to all users on the platform. Use this for important announcements.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onBroadcastSubmit)} className="space-y-4">
                <FormField control={form.control} name="title" render={({ field }) => (<FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>)} />
                <FormField control={form.control} name="description" render={({ field }) => (<FormItem><FormLabel>Message</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>)} />
                <Button type="submit" disabled={broadcastMutation.isPending}>
                  {broadcastMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Send Broadcast
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <BroadcastHistory />
      </div>

      <AlertDialog open={isConfirmMaturityOpen} onOpenChange={setIsConfirmMaturityOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirm Manual Trigger</AlertDialogTitle><AlertDialogDescription>Are you sure you want to manually run the investment maturity process? This action is safe to run multiple times, as it will only process investments that are currently due.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => maturityMutation.mutate()} disabled={maturityMutation.isPending}>Confirm & Run</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!broadcastToConfirm} onOpenChange={() => setBroadcastToConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirm Broadcast</AlertDialogTitle><AlertDialogDescription>Are you sure you want to send this notification to all users? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <div className="my-4 rounded-md border p-4 space-y-2"><p className="font-semibold">{broadcastToConfirm?.title}</p><p className="text-sm text-muted-foreground">{broadcastToConfirm?.description}</p></div>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => broadcastMutation.mutate(broadcastToConfirm!)} disabled={broadcastMutation.isPending}>Confirm & Send</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SystemManagement;