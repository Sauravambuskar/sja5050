import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileSignature, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export const SignAgreementPrompt = () => {
  return (
    <Card className="my-6 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-900/50">
      <CardHeader>
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900">
            <FileSignature className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <CardTitle>Action Required: Sign Your Investment Bond</CardTitle>
            <CardDescription>
              To ensure a secure and transparent investment journey, you must review and sign our digital investment agreement before you can access our investment plans.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link to="/agreement">
            Review & Sign Agreement
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};