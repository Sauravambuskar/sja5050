import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck } from "lucide-react";

const KycTab = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>KYC Verification</CardTitle>
        <CardDescription>
          This feature is under development. Soon you will be able to upload and manage your KYC documents here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted bg-muted/50 p-12 text-center">
          <ShieldCheck className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg font-semibold text-muted-foreground">Coming Soon</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default KycTab;