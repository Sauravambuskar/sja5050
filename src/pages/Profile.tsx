import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PersonalDetailsForm from "@/components/profile/PersonalDetailsForm";
import BankDetailsForm from "@/components/profile/BankDetailsForm";
import KycDocuments from "@/components/profile/KycDocuments";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Profile as ProfileType } from "@/types/database";
import { Loader2 } from "lucide-react";
import { NomineeForm } from "@/components/profile/NomineeForm";
import { useSearchParams } from "react-router-dom";
import SecuritySettings from "@/components/profile/SecuritySettings";
import { useMemo } from "react";
import { ProfileCompleteness } from "@/components/profile/ProfileCompleteness";
import { IdCard } from "@/components/profile/IdCard";

const fetchMyProfile = async (): Promise<ProfileType> => {
  const { data, error } = await supabase.rpc('get_my_profile');
  if (error) throw new Error(error.message);
  return data[0];
};

const Profile = () => {
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get('tab');

  const { data: profile, isLoading, isError, error } = useQuery<ProfileType>({
    queryKey: ['myProfile'],
    queryFn: fetchMyProfile,
  });

  const defaultTab = useMemo(() => {
    if (tabFromUrl) {
      return tabFromUrl;
    }
    if (profile && profile.kyc_status !== 'Approved') {
      return 'kyc';
    }
    return 'personal';
  }, [tabFromUrl, profile]);

  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (isError) {
    return <div className="text-red-500">Error loading profile: {error.message}</div>;
  }

  return (
    <>
      <h1 className="text-3xl font-bold">My Profile</h1>
      <p className="text-muted-foreground">
        Manage your personal information, bank details, and KYC status.
      </p>
      
      <div className="mt-6">
        <ProfileCompleteness profile={profile} />
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="personal">Personal Info</TabsTrigger>
            <TabsTrigger value="bank">Bank Details</TabsTrigger>
            <TabsTrigger value="nominee">Nominee</TabsTrigger>
            <TabsTrigger value="kyc">KYC</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="id-card">ID Card</TabsTrigger>
          </TabsList>
          <TabsContent value="personal" className="mt-6">
            <PersonalDetailsForm profile={profile} />
          </TabsContent>
          <TabsContent value="bank" className="mt-6">
            <BankDetailsForm profile={profile} />
          </TabsContent>
          <TabsContent value="nominee" className="mt-6">
            <NomineeForm profile={profile} />
          </TabsContent>
          <TabsContent value="kyc" className="mt-6">
            <KycDocuments />
          </TabsContent>
          <TabsContent value="security" className="mt-6">
            <SecuritySettings />
          </TabsContent>
          <TabsContent value="id-card" className="mt-6">
            <IdCard />
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
};

export default Profile;