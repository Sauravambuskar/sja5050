import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ShieldCheck, LogIn } from "lucide-react";

type PublicAgreementPayload = {
  agreement_name?: string;
  reference_number?: string;
  first_party_name?: string;
  second_party_name?: string;
  investment_date?: string;
  invested_amount?: number;
  status?: string;
  document_hash?: string;
  generated_at?: string;
};

const fetchPublicAgreement = async (token: string) => {
  const { data, error } = await supabase.rpc("get_agreement_public_view", { p_token: token });
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return row as { payload: PublicAgreementPayload; created_at: string; updated_at: string; token: string };
};

export default function VerifyAgreement() {
  const { token } = useParams<{ token: string }>();

  const query = useQuery({
    queryKey: ["publicAgreementView", token],
    queryFn: () => fetchPublicAgreement(token!),
    enabled: !!token,
  });

  const payload = query.data?.payload;

  const rows = useMemo(() => {
    if (!payload) return [];
    const amount = payload.invested_amount;
    return [
      { label: "Agreement", value: payload.agreement_name || "Investment Agreement" },
      { label: "Reference No.", value: payload.reference_number || "—" },
      { label: "Borrower (First Party)", value: payload.first_party_name || "—" },
      { label: "Lender (Second Party)", value: payload.second_party_name || "—" },
      { label: "Investment Date", value: payload.investment_date || "—" },
      {
        label: "Invested Amount",
        value: typeof amount === "number" ? `₹${amount.toLocaleString("en-IN")}` : "—",
      },
      { label: "Status", value: payload.status || "—" },
      { label: "Document Hash (SHA-256)", value: payload.document_hash || "—" },
    ];
  }, [payload]);

  if (query.isLoading) {
    return (
      <div className="container mx-auto max-w-2xl p-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="container mx-auto max-w-2xl p-6">
        <Alert variant="destructive">
          <AlertTitle>Agreement not found</AlertTitle>
          <AlertDescription>
            This verification link is invalid or expired. If you are the agreement owner, please sign in and open the
            Agreement page again.
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button asChild>
            <Link to="/login">
              <LogIn className="mr-2 h-4 w-4" />
              Sign in
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Agreement Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            This page is public and shows only non-sensitive agreement details.
          </div>

          <div className="rounded-md border">
            {rows.map((row) => (
              <div key={row.label} className="grid gap-2 border-b p-3 last:border-b-0 sm:grid-cols-3">
                <div className="text-xs font-medium text-muted-foreground">{row.label}</div>
                <div className="sm:col-span-2 break-words text-sm">{row.value}</div>
              </div>
            ))}
          </div>

          <div className="text-xs text-muted-foreground">
            Updated: {query.data.updated_at ? new Date(query.data.updated_at).toLocaleString() : "—"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
