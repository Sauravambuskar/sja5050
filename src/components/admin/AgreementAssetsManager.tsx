import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Stamp, PenLine, Upload } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { createSignedUrl, fetchAgreementAssets, AGREEMENT_ASSETS_BUCKET } from "@/lib/agreements";

const schema = z.object({
  first_party_name: z.string().min(2, "First party name is required"),
});

type FormValues = z.infer<typeof schema>;

async function uploadAsset(file: File, kind: "stamp" | "company_signature") {
  const ext = file.name.split(".").pop() || "png";
  const safeExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "png";
  const path = `agreement/${kind}.${safeExt}`;

  const { error } = await supabase.storage
    .from(AGREEMENT_ASSETS_BUCKET)
    .upload(path, file, { upsert: true, cacheControl: "3600" });

  if (error) throw error;
  return path;
}

export function AgreementAssetsManager() {
  const queryClient = useQueryClient();
  const [stampPath, setStampPath] = useState<string | null>(null);
  const [companySigPath, setCompanySigPath] = useState<string | null>(null);

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { first_party_name: "" } });

  const { data, isLoading } = useQuery({
    queryKey: ["agreementAssets"],
    queryFn: fetchAgreementAssets,
  });

  useEffect(() => {
    if (!data) return;
    form.reset({ first_party_name: data.first_party_name || "SJA Foundation" });
    setStampPath(data.stamp_path);
    setCompanySigPath(data.company_signature_path);
  }, [data, form]);

  const stampPreviewQuery = useQuery({
    queryKey: ["agreementAssetPreview", "stamp", stampPath],
    enabled: !!stampPath,
    queryFn: async () => createSignedUrl(AGREEMENT_ASSETS_BUCKET, stampPath!, 60 * 30),
  });

  const sigPreviewQuery = useQuery({
    queryKey: ["agreementAssetPreview", "company_signature", companySigPath],
    enabled: !!companySigPath,
    queryFn: async () => createSignedUrl(AGREEMENT_ASSETS_BUCKET, companySigPath!, 60 * 30),
  });

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { error } = await supabase.rpc("admin_update_agreement_assets", {
        p_first_party_name: values.first_party_name,
        p_stamp_path: stampPath,
        p_company_signature_path: companySigPath,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Agreement assets updated.");
      queryClient.invalidateQueries({ queryKey: ["agreementAssets"] });
      queryClient.invalidateQueries({ queryKey: ["systemSettings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadStampMutation = useMutation({
    mutationFn: async (file: File) => {
      const path = await uploadAsset(file, "stamp");
      setStampPath(path);
      return path;
    },
    onSuccess: () => toast.success("Stamp uploaded."),
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadSigMutation = useMutation({
    mutationFn: async (file: File) => {
      const path = await uploadAsset(file, "company_signature");
      setCompanySigPath(path);
      return path;
    },
    onSuccess: () => toast.success("Company signature uploaded."),
    onError: (e: Error) => toast.error(e.message),
  });

  const isBusy =
    isLoading || mutation.isPending || uploadStampMutation.isPending || uploadSigMutation.isPending;

  const stampUrl = stampPreviewQuery.data;
  const sigUrl = sigPreviewQuery.data;

  const canSave = useMemo(() => {
    const v = form.getValues();
    return Boolean(v.first_party_name?.trim());
  }, [form]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Agreement Assets</CardTitle>
        <CardDescription>
          Upload the official stamp and company signature used in the final agreement PDF.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-6">
              <FormField
                control={form.control}
                name="first_party_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First party name (Company / Authorized signatory name)</FormLabel>
                    <FormControl>
                      <Input placeholder="First party name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 font-medium">
                    <Stamp className="h-4 w-4" /> Stamp image
                  </div>
                  {stampUrl ? (
                    <div className="rounded-md border bg-background p-3">
                      <img src={stampUrl} alt="Stamp preview" className="h-28 w-auto object-contain" />
                    </div>
                  ) : (
                    <div className="rounded-md border bg-muted/30 p-6 text-sm text-muted-foreground">
                      No stamp uploaded yet.
                    </div>
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      uploadStampMutation.mutate(f);
                      e.target.value = "";
                    }}
                    disabled={isBusy}
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 font-medium">
                    <PenLine className="h-4 w-4" /> Company signature image
                  </div>
                  {sigUrl ? (
                    <div className="rounded-md border bg-background p-3">
                      <img src={sigUrl} alt="Company signature preview" className="h-28 w-auto object-contain" />
                    </div>
                  ) : (
                    <div className="rounded-md border bg-muted/30 p-6 text-sm text-muted-foreground">
                      No company signature uploaded yet.
                    </div>
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      uploadSigMutation.mutate(f);
                      e.target.value = "";
                    }}
                    disabled={isBusy}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={isBusy || !canSave}>
                  {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Save Assets
                </Button>
              </div>
            </form>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}
