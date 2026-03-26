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
  try {
    console.log(`Starting upload for ${kind}:`, file.name, file.size, file.type);
    
    const ext = file.name.split(".").pop() || "png";
    const safeExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "png";
    const path = `agreement/${kind}.${safeExt}`;

    console.log(`Upload path: ${path}`);

    const { data, error } = await supabase.storage
      .from(AGREEMENT_ASSETS_BUCKET)
      .upload(path, file, { upsert: true, cacheControl: "3600" });

    console.log(`Upload result for ${kind}:`, { data, error });

    if (error) {
      console.error(`Upload error for ${kind}:`, error);
      throw new Error(`Failed to upload ${kind}: ${error.message}`);
    }

    console.log(`${kind} uploaded successfully to:`, data?.path);
    return data?.path || path;
  } catch (error) {
    console.error(`Upload exception for ${kind}:`, error);
    throw error;
  }
}

export function AgreementAssetsManager() {
  const queryClient = useQueryClient();
  const [stampPath, setStampPath] = useState<string | null>(null);
  const [companySigPath, setCompanySigPath] = useState<string | null>(null);

  const form = useForm<FormValues>({ 
    resolver: zodResolver(schema), 
    defaultValues: { first_party_name: "SJA Foundation" },
    mode: "onChange" // Enable validation on change
  });

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
      console.log("=== Starting Save Assets ===");
      console.log("Form values:", values);
      console.log("Stamp path:", stampPath);
      console.log("Company sig path:", companySigPath);
      
      // Check if user is admin
      const { data: { user } } = await supabase.auth.getUser();
      console.log("Current user:", user?.id, user?.email);
      
      // Check user role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user?.id)
        .single();
      console.log("User role:", profile?.role);
      
      if (profile?.role !== 'admin') {
        throw new Error("You must be an admin to save agreement assets");
      }
      
      const { error, data: result } = await supabase.rpc("admin_update_agreement_assets", {
        p_first_party_name: values.first_party_name,
        p_stamp_path: stampPath,
        p_company_signature_path: companySigPath,
      });
      
      console.log("RPC result:", result);
      console.log("RPC error:", error);
      
      if (error) {
        console.error("RPC Error details:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        });
        throw new Error(`Failed to save: ${error.message}`);
      }
      
      return result;
    },
    onSuccess: (data) => {
      console.log("Save success:", data);
      toast.success("Agreement assets updated successfully.");
      queryClient.invalidateQueries({ queryKey: ["agreementAssets"] });
      queryClient.invalidateQueries({ queryKey: ["systemSettings"] });
    },
    onError: (e: Error) => {
      console.error("Save error:", e);
      toast.error(`Failed to save assets: ${e.message}`);
    },
  });

  const uploadStampMutation = useMutation({
    mutationFn: async (file: File) => {
      console.log("Uploading stamp:", file.name);
      const path = await uploadAsset(file, "stamp");
      console.log("Stamp uploaded to:", path);
      setStampPath(path);
      return path;
    },
    onSuccess: (path) => {
      toast.success("Stamp uploaded successfully.");
      console.log("Stamp upload success:", path);
    },
    onError: (e: Error) => {
      console.error("Stamp upload error:", e);
      toast.error(`Failed to upload stamp: ${e.message}`);
    },
  });

  const uploadSigMutation = useMutation({
    mutationFn: async (file: File) => {
      console.log("Uploading company signature:", file.name);
      const path = await uploadAsset(file, "company_signature");
      console.log("Company signature uploaded to:", path);
      setCompanySigPath(path);
      return path;
    },
    onSuccess: (path) => {
      toast.success("Company signature uploaded successfully.");
      console.log("Company signature upload success:", path);
    },
    onError: (e: Error) => {
      console.error("Company signature upload error:", e);
      toast.error(`Failed to upload company signature: ${e.message}`);
    },
  });

  const isBusy =
    isLoading || mutation.isPending || uploadStampMutation.isPending || uploadSigMutation.isPending;

  const stampUrl = stampPreviewQuery.data;
  const sigUrl = sigPreviewQuery.data;

  const { isValid, isDirty } = form.formState;

  const handleSave = async () => {
    console.log("Handle save called");
    console.log("Form valid:", isValid);
    console.log("Form dirty:", isDirty);
    console.log("Form values:", form.getValues());
    
    // Trigger validation
    const valid = await form.trigger();
    console.log("Validation result:", valid);
    
    if (valid) {
      const values = form.getValues();
      console.log("Submitting with values:", values);
      mutation.mutate(values);
    } else {
      toast.error("Please fix the form errors before saving.");
    }
  };

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
            <div className="space-y-6">
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
                <Button 
                  type="button"
                  disabled={isBusy || !isValid}
                  onClick={handleSave}
                >
                  {mutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Save Assets
                </Button>
                {!isValid && (
                  <span className="text-sm text-muted-foreground">
                    Please enter a valid first party name (minimum 2 characters)
                  </span>
                )}
                {isValid && (
                  <span className="text-sm text-green-600 dark:text-green-400">
                    ✓ Ready to save
                  </span>
                )}
              </div>

              {/* Debug Info - Remove in production */}
              {process.env.NODE_ENV === 'development' && (
                <div className="mt-4 rounded-md border bg-muted/50 p-3 text-xs">
                  <div className="font-semibold mb-2">Debug Info:</div>
                  <div>Form valid: {isValid ? 'Yes' : 'No'}</div>
                  <div>Form dirty: {isDirty ? 'Yes' : 'No'}</div>
                  <div>Stamp path: {stampPath || 'Not set'}</div>
                  <div>Company sig path: {companySigPath || 'Not set'}</div>
                  <div>Form values: {JSON.stringify(form.getValues())}</div>
                </div>
              )}
            </div>
          </Form>
        )}
      </CardContent>
    </Card>
  );
}