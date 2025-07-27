import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Banknote } from "lucide-react";

const BankDetailsForm = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Bank Details</CardTitle>
        <CardDescription>
          This feature is coming soon. You will be able to manage your bank account details for withdrawals here.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted bg-muted/50 p-12 text-center">
          <Banknote className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg font-semibold text-muted-foreground">Coming Soon</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default BankDetailsForm;