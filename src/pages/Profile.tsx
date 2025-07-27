import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PersonalDetailsForm from "@/components/profile/PersonalDetailsForm";
import BankDetailsForm from "@/components/profile/BankDetailsForm";
import KycTab from "@/components/profile/KycTab";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Profile as ProfileType } from "@/types/database";
import { Loader2 } from "lucide-react";
import { NomineeForm } from "@/components/profile/NomineeForm";

const fetchMyProfile = async (): Promise<ProfileType> => {
  const { data, error } = await supabase.rpc('get_my_profile');
  if (error) throw new Error(error.message);
  return data[0];
};

const Profile = () => {
  const { data: profile, isLoading, isError, error } = useQuery<ProfileType>({
    queryKey: ['myProfile'],
    queryFn: fetchMyProfile,
  });

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
      <Tabs defaultValue="personal" className="mt-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="bank">Bank Details</TabsTrigger>
          <TabsTrigger value="nominee">Nominee</TabsTrigger>
          <TabsTrigger value="kyc">KYC</TabsTrigger>
        </TabsList>
        <TabsContent value="personal" className="mt-6">
          <PersonalDetailsForm profile={profile} />
        </TabsContent>
        <TabsContent value="bank" className="mt-6">
          <BankDetailsForm />
        </TabsContent>
        <TabsContent value="nominee" className="mt-6">
          <NomineeForm profile={profile} />
        </TabsContent>
        <TabsContent value="kyc" className="mt-6">
          <KycTab />
        </TabsContent>
      </Tabs>
    </>
  );
};

export default Profile;