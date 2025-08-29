import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PersonalDetailsForm from "@/components/profile/PersonalDetailsForm";
import { BankDetailsForm } from "@/components/profile/BankDetailsForm";
import { NomineeForm } from "@/components/profile/NomineeForm";
import { KycForm } from "@/components/profile/KycForm";
import { SecuritySettings } from "@/components/profile/SecuritySettings";
import { VideoKyc } from "@/components/profile/VideoKyc";
import { AdditionalDocuments } from "@/components/profile/AdditionalDocuments";
import { useProfile } from "@/hooks/useProfile";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const ProfilePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const isMobile = useIsMobile();
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
    { value: "nominee", label: "Nominee", component: <NomineeForm profile={profile} /> },
    { value: "kyc", label: "KYC", component: <KycForm profile={profile} /> },
    { value: "video-kyc", label: "Video KYC", component: <VideoKyc /> },
    { value: "additional-docs", label: "Additional Documents", component: <AdditionalDocuments /> },
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
          orientation={isMobile ? "horizontal" : "vertical"}
          className={cn(!isMobile && "grid grid-cols-5 gap-6")}
        >
          <TabsList
            className={cn(
              !isMobile && "flex-col h-auto items-stretch justify-start col-span-1"
            )}
          >
            {tabs.map(tab => (
              <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
            ))}
          </TabsList>

          <div className={cn(!isMobile && "col-span-4")}>
            {tabs.map(tab => (
              <TabsContent key={tab.value} value={tab.value} className={cn(!isMobile && "mt-0")}>
                {tab.component}
              </TabsContent>
            ))}
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ProfilePage;