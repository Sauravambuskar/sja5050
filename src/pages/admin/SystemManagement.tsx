import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Loader2, PlayCircle } from "lucide-react";
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

const triggerMaturityProcessing = async () => {
  const { data, error } = await supabase.functions.invoke('admin-trigger-maturities');
  if (error) throw new Error(error.message);
  if (data.error) throw new Error(data.error);
  return data;
};

const SystemManagement = () => {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const mutation = useMutation({
    mutationFn: triggerMaturityProcessing,
    onSuccess: (data) => {
      toast.success("Maturity processing complete.", {
        description: data.message,
      });
    },
    onError: (error) => {
      toast.error(`Processing failed: ${error.message}`);
    },
    onSettled: () => {
      setIsConfirmOpen(false);
    },
  });

  return (
    <>
      <h1 className="text-3xl font-bold">System Management</h1>
      <p className="text-muted-foreground">Manually trigger system-wide jobs and processes.</p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Investment Maturity Processing</CardTitle>
          <CardDescription>
            This job finds all active investments that have reached their maturity date, calculates the final payout, credits the user's wallet, and updates the investment status to 'Matured'. This process normally runs automatically once per day.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setIsConfirmOpen(true)} disabled={mutation.isPending}>
            {mutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <PlayCircle className="mr-2 h-4 w-4" />
            )}
            Run Manually
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Manual Trigger</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to manually run the investment maturity process? This action is safe to run multiple times, as it will only process investments that are currently due.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => mutation.mutate()} disabled={mutation.isPending}>
              Confirm & Run
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SystemManagement;