import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PersonalDetailsForm from "@/components/profile/PersonalDetailsForm";
import { BankDetailsForm } from "@/components/profile/BankDetailsForm";
import { NomineeForm } from "@/components/profile/NomineeForm";
import { KycForm } from "@/components/profile/KycForm";
import KycDocuments from "@/components/profile/KycDocuments";
import { SecuritySettings } from "@/components/profile/SecuritySettings";
import { VideoKyc } from "@/components/profile/VideoKyc";
import { AdditionalDocuments } from "@/components/profile/AdditionalDocuments";
import { useProfile } from "@/hooks/useProfile";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Separator } from "@/components/ui/separator";

const ProfilePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: profile, isLoading, error } = useProfile();

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (error) {
    return <div className="text-red-500 text-center">Error loading profile: {error.message}</div>;
  }

  if (!profile) {
    return <div className="text-center">Could not load profile data.</div>;
  }

  const tabs = [
    { value: "personal", label: "Personal", component: <PersonalDetailsForm profile={profile} /> },
    { value: "bank", label: "Bank", component: <BankDetailsForm profile={profile} /> },
    {
      value: "kyc-and-docs",
      label: "KYC & Documents",
      component: (
        <div className="space-y-6">
          <KycDocuments profile={profile} />
          <Separator className="my-6" />
          <h2 className="text-xl font-semibold">Additional Documents</h2>
          <p className="text-muted-foreground">Upload any other supporting documents.</p>
          <AdditionalDocuments />
          <Separator className="my-6" />
          <h2 className="text-xl font-semibold">Nominee Details</h2>
          <p className="text-muted-foreground">Manage your nominee information.</p>
          <NomineeForm />
        </div>
      ),
    },
    { value: "security", label: "Security", component: <SecuritySettings /> },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Profile</CardTitle>
        <CardDescription>
          Manage your personal, financial, and security settings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs
          defaultValue={searchParams.get("tab") || "personal"}
          onValueChange={(value) => setSearchParams({ tab: value })}
          className="w-full"
        >
          <div className="md:grid md:grid-cols-[200px_1fr] md:gap-8">
            <TabsList className="flex w-full flex-nowrap overflow-x-auto whitespace-nowrap border-b pb-px md:flex-col md:h-auto md:items-stretch md:justify-start md:whitespace-normal md:border-b-0 md:border-r md:pb-0 md:pr-6">
              {tabs.map(tab => (
                <TabsTrigger key={tab.value} value={tab.value} className="flex-shrink-0 justify-start px-3 py-2.5">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
            <div className="mt-6 md:mt-0">
              {tabs.map(tab => (
                <TabsContent key={tab.value} value={tab.value} className="mt-0">
                  {tab.component}
                </TabsContent>
              ))}
            </div>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ProfilePage;