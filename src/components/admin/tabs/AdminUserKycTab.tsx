import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Loader2, Save } from "lucide-react";
import { useState, useEffect } from "react";
import { KycViewerDialog } from "@/components/admin/KycViewerDialog";
import { AdminKycRequest, Profile } from "@/types/database";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
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

const fetchUserKycDocs = async (userId: string): Promise<AdminKycRequest[]> => {
  const { data, error } = await supabase.rpc('get_user_kyc_documents_for_admin', { user_id_to_fetch: userId });
  if (error) throw new Error(error.message);
  return data;
};

const fetchUserProfileForAdmin = async (userId: string): Promise<Profile> => {
  const { data, error } = await supabase.rpc('get_user_profile_for_admin', { user_id_to_fetch: userId });
  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error('User profile not found.');
  return data[0];
};

const kycDetailsSchema = z.object({
  aadhaar_number: z.string().optional().nullable(),
  pan_number: z.string().optional().nullable(),
  blood_group: z.string().optional().nullable(),
});

type KycDetailsFormValues = z.infer<typeof kycDetailsSchema>;

export const AdminUserKycTab = ({ userId }: { userId: string }) => {
  const queryClient = useQueryClient();
  const [viewingRequest, setViewingRequest] = useState<AdminKycRequest | null>(null);
  const [action, setAction] = useState<null | { status: 'Approved' | 'Rejected' }>(null);
  const [notes, setNotes] = useState('');

  const form = useForm<KycDetailsFormValues>({
    resolver: zodResolver(kycDetailsSchema),
    defaultValues: { aadhaar_number: '', pan_number: '', blood_group: '' },
  });

  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['userProfileForAdmin', userId],
    queryFn: () => fetchUserProfileForAdmin(userId),
    enabled: !!userId,
  });

  const { data: documents, isLoading } = useQuery({
    queryKey: ['userKycDocsForAdmin', userId],
    queryFn: () => fetchUserKycDocs(userId),
    enabled: !!userId,
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        aadhaar_number: profile.aadhaar_number || '',
        pan_number: profile.pan_number || '',
        blood_group: profile.blood_group || '',
      });
    }
  }, [profile, form]);

  const saveDetailsMutation = useMutation({
    mutationFn: async (values: KycDetailsFormValues) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          aadhaar_number: values.aadhaar_number || null,
          pan_number: values.pan_number || null,
          blood_group: values.blood_group || null,
        })
        .eq('id', userId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('KYC details updated.');
      queryClient.invalidateQueries({ queryKey: ['userProfileForAdmin', userId] });
      queryClient.invalidateQueries({ queryKey: ['adminKycOverview'] });
    },
    onError: (error: Error) => toast.error(`Update failed: ${error.message}`),
  });

  const processKycMutation = useMutation({
    mutationFn: async ({ status, notes }: { status: 'Approved' | 'Rejected'; notes: string }) => {
      const { error } = await supabase.rpc('admin_process_user_kyc', {
        p_user_id: userId,
        p_new_status: status,
        p_admin_notes: notes,
      });
      if (error) throw new Error(error.message);
    },
    onSuccess: (_, vars) => {
      toast.success(`KYC ${vars.status.toLowerCase()}.`);
      queryClient.invalidateQueries({ queryKey: ['userProfileForAdmin', userId] });
      queryClient.invalidateQueries({ queryKey: ['userKycDocsForAdmin', userId] });
      queryClient.invalidateQueries({ queryKey: ['adminKycOverview'] });
      queryClient.invalidateQueries({ queryKey: ['adminStats'] });
    },
    onError: (error: Error) => toast.error(error.message),
    onSettled: () => {
      setAction(null);
      setNotes('');
    },
  });

  const onSubmit = (values: KycDetailsFormValues) => saveDetailsMutation.mutate(values);

  const currentStatus = profile?.kyc_status || 'Not Submitted';

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>KYC Details</span>
            <Badge variant={currentStatus === 'Approved' ? 'default' : currentStatus === 'Pending' ? 'outline' : 'destructive'}>
              {currentStatus}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isProfileLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="aadhaar_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Aadhaar Number</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="pan_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>PAN Number</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="blood_group"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Blood Group</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="md:col-span-3 flex flex-wrap items-center gap-2">
                    <Button type="submit" disabled={saveDetailsMutation.isPending}>
                      {saveDetailsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save KYC Details
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setAction({ status: 'Approved' })}>
                      Approve KYC
                    </Button>
                    <Button type="button" variant="destructive" onClick={() => setAction({ status: 'Rejected' })}>
                      Reject KYC
                    </Button>
                  </div>
                </form>
              </Form>
              <p className="text-xs text-muted-foreground">
                Approve/Reject will update the user's overall KYC status and mark any pending KYC documents accordingly.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>KYC Documents</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document Type</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                [...Array(2)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-8" /></TableCell>
                  </TableRow>
                ))
              ) : documents && documents.length > 0 ? (
                documents.map((doc) => (
                  <TableRow key={doc.request_id}>
                    <TableCell>
                      <div className="font-medium">{doc.document_type}</div>
                      {doc.status === 'Rejected' && doc.admin_notes && (<p className="text-xs text-destructive mt-1">Note: {doc.admin_notes}</p>)}
                    </TableCell>
                    <TableCell>{format(new Date(doc.submitted_at), "PPP")}</TableCell>
                    <TableCell><Badge variant={doc.status === "Approved" ? "default" : doc.status === "Pending" ? "outline" : "destructive"}>{doc.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => setViewingRequest(doc)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={4} className="h-24 text-center">No KYC documents submitted.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <KycViewerDialog
        request={viewingRequest}
        isOpen={!!viewingRequest}
        onClose={() => setViewingRequest(null)}
      />

      <AlertDialog open={!!action} onOpenChange={(open) => !open && setAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm KYC {action?.status}</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to {action?.status?.toLowerCase()} this user's KYC.
              {action?.status === 'Rejected' && (
                <div className="mt-3">
                  <FormLabel>Rejection Notes (required)</FormLabel>
                  <Textarea className="mt-2" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!action) return;
                if (action.status === 'Rejected' && !notes.trim()) {
                  toast.error('Rejection notes are required.');
                  return;
                }
                processKycMutation.mutate({ status: action.status, notes });
              }}
              disabled={processKycMutation.isPending}
            >
              {processKycMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};