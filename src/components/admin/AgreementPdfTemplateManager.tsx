import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, FileText, Settings } from "lucide-react";
import { inspectPdfFormFields } from "@/lib/agreementPdfTemplate";

type FieldMap = {
  full_name?: string;
  residential_address?: string;
  contact_number?: string;
  email_address?: string;
  government_id_details?: string;
  business_name_if_applicable?: string;
  organization_name?: string;
  authorized_signatory_name?: string;
  agreement_execution_date?: string;
  unique_agreement_reference_number?: string;
  registered_office_address?: string;
  official_contact_details?: string;
  user_signature?: string;
  company_signature?: string;
  admin_signature?: string;
  stamp?: string;
};

const fetchSettings = async () => {
  const { data, error } = await supabase.from("system_settings").select("*").single();
  if (error) throw error;
  return data;
};

const updateFieldMap = async (fieldMap: FieldMap) => {
  const { error } = await supabase
    .from("system_settings")
    .update({ agreement_pdf_field_map: fieldMap })
    .eq("id", 1);
  if (error) throw error;
};

export function AgreementPdfTemplateManager() {
  const queryClient = useQueryClient();
  const [fieldMap, setFieldMap] = useState<FieldMap>({});
  const [templateUrl, setTemplateUrl] = useState("");
  const [detectedFields, setDetectedFields] = useState<string[]>([]);
  const [isInspecting, setIsInspecting] = useState(false);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["systemSettings"],
    queryFn: fetchSettings,
  });

  useEffect(() => {
    if (!settings) return;
    setFieldMap((settings.agreement_pdf_field_map as FieldMap) || {});
    setTemplateUrl(settings.agreement_pdf_template_url || "/agreement-templates/PGS_2.pdf");
  }, [settings]);

  const inspectMutation = useMutation({
    mutationFn: async () => {
      setIsInspecting(true);
      try {
        const fields = await inspectPdfFormFields(templateUrl);
        setDetectedFields(fields.map((f) => f.name));
        toast.success(`Detected ${fields.length} form fields in PDF template`);
      } catch (error: any) {
        toast.error(`Failed to inspect PDF: ${error.message}`);
      } finally {
        setIsInspecting(false);
      }
    },
  });

  const saveMutation = useMutation({
    mutationFn: updateFieldMap,
    onSuccess: () => {
      toast.success("PDF field mapping saved successfully");
      queryClient.invalidateQueries({ queryKey: ["systemSettings"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleFieldChange = (key: keyof FieldMap, value: string) => {
    setFieldMap((prev) => ({ ...prev, [key]: value || undefined }));
  };

  const loadRecommendedMapping = () => {
    const recommended: FieldMap = {
      full_name: "full_name",
      residential_address: "residential_address",
      contact_number: "contact_number",
      email_address: "email_address",
      government_id_details: "government_id_details",
      organization_name: "organization_name",
      authorized_signatory_name: "authorized_signatory_name",
      agreement_execution_date: "agreement_execution_date",
      unique_agreement_reference_number: "unique_agreement_reference_number",
      registered_office_address: "registered_office_address",
      official_contact_details: "official_contact_details",
      user_signature: "user_signature",
      company_signature: "company_signature",
      admin_signature: "admin_signature",
      stamp: "stamp",
    };
    setFieldMap(recommended);
    toast.success("Recommended field mapping loaded");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          PDF Template Field Mapping
        </CardTitle>
        <CardDescription>
          Configure which PDF form fields correspond to agreement data. This ensures signatures and stamps appear in the correct locations.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Template URL */}
            <div className="space-y-2">
              <Label>PDF Template URL</Label>
              <Input
                value={templateUrl}
                onChange={(e) => setTemplateUrl(e.target.value)}
                placeholder="/agreement-templates/PGS_2.pdf"
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => inspectMutation.mutate()}
                  disabled={isInspecting || !templateUrl}
                >
                  {isInspecting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="mr-2 h-4 w-4" />
                  )}
                  Inspect PDF Fields
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadRecommendedMapping}
                >
                  Load Recommended Mapping
                </Button>
              </div>
            </div>

            {/* Detected Fields */}
            {detectedFields.length > 0 && (
              <div className="space-y-2">
                <Label>Detected Form Fields in PDF:</Label>
                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="flex flex-wrap gap-2">
                    {detectedFields.map((field) => (
                      <span
                        key={field}
                        className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                      >
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Field Mapping */}
            <div className="space-y-4">
              <Label className="text-base font-semibold">Field Mapping</Label>
              <p className="text-sm text-muted-foreground">
                Map agreement data fields to PDF form field names. Leave empty if the field doesn't exist in your PDF.
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Text Fields */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Text Fields</h4>
                  {[
                    { key: "full_name", label: "Full Name" },
                    { key: "residential_address", label: "Residential Address" },
                    { key: "contact_number", label: "Contact Number" },
                    { key: "email_address", label: "Email Address" },
                    { key: "government_id_details", label: "Government ID Details" },
                    { key: "organization_name", label: "Organization Name" },
                    { key: "authorized_signatory_name", label: "Authorized Signatory Name" },
                    { key: "agreement_execution_date", label: "Agreement Execution Date" },
                    { key: "unique_agreement_reference_number", label: "Reference Number" },
                    { key: "registered_office_address", label: "Registered Office Address" },
                    { key: "official_contact_details", label: "Official Contact Details" },
                  ].map(({ key, label }) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs">{label}</Label>
                      <Input
                        value={fieldMap[key as keyof FieldMap] || ""}
                        onChange={(e) => handleFieldChange(key as keyof FieldMap, e.target.value)}
                        placeholder={`PDF field name for ${label}`}
                      />
                    </div>
                  ))}
                </div>

                {/* Image Fields */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Image Fields (Signatures & Stamp)</h4>
                  <div className="rounded-md border bg-amber-50 dark:bg-amber-950/20 p-3">
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      <strong>Important:</strong> These fields must be image/signature fields in your PDF template for signatures and stamps to appear correctly.
                    </p>
                  </div>
                  {[
                    { key: "user_signature", label: "User Signature" },
                    { key: "company_signature", label: "Company Signature" },
                    { key: "admin_signature", label: "Admin Signature" },
                    { key: "stamp", label: "Stamp" },
                  ].map(({ key, label }) => (
                    <div key={key} className="space-y-1">
                      <Label className="text-xs">{label}</Label>
                      <Input
                        value={fieldMap[key as keyof FieldMap] || ""}
                        onChange={(e) => handleFieldChange(key as keyof FieldMap, e.target.value)}
                        placeholder={`PDF field name for ${label}`}
                        className="border-primary/50"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                onClick={() => saveMutation.mutate(fieldMap)}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Settings className="mr-2 h-4 w-4" />
                )}
                Save Field Mapping
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}