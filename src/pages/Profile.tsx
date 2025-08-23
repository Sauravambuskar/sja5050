import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PersonalDetailsForm from "@/components/profile/PersonalDetailsForm";
import BankDetailsForm from "@/components/profile/BankDetailsForm";
import KycDocuments from "@/components/profile/KycDocuments";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Profile as ProfileType } from "@/types/database";
import { Download, Loader2 } from "lucide-react";
import { NomineeForm } from "@/components/profile/NomineeForm";
import { useSearchParams } from "react-router-dom";
import SecuritySettings from "@/components/profile/SecuritySettings";
import { useMemo } from "react";
import { ProfileCompleteness } from "@/components/profile/ProfileCompleteness";
import { IdCard } from "@/components/profile/IdCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { exportToPdf } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";

const fetchMyProfile = async (): Promise<ProfileType> => {
  const { data, error } = await supabase.rpc('get_my_profile');
  if (error) throw new Error(error.message);
  return data[0];
};

const Profile = () => {
  const { user } = useAuth();
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

  const handleDownloadProfile = () => {
    if (!profile) {
      toast.error("Profile data not loaded yet.");
      return;
    }

    const filename = `SJA_Profile_${profile.member_id}.pdf`;
    const title = "My Profile Statement";
    const headers = ["Field", "Details"];
    const data = [
      ["Member ID", profile.member_id || 'N/A'],
      ["Full Name", profile.full_name || 'N/A'],
      ["Email", user?.email || 'N/A'],
      ["Phone", profile.phone || 'N/A'],
      ["Date of Birth", profile.dob ? format(new Date(profile.dob), 'PPP') : 'N/A'],
      ["Address", `${profile.address || ''}, ${profile.city || ''}, ${profile.state || ''} - ${profile.pincode || ''}`.replace(/, ,/g, ',').replace(/^,|,$/g, '')],
      ["KYC Status", profile.kyc_status || 'N/A'],
      ["Referral Code", profile.referral_code || 'N/A'],
      ["Referred By", profile.referrer_full_name || 'N/A'],
      ["Bank Account Holder", profile.bank_account_holder_name || 'N/A'],
      ["Bank Account Number", profile.bank_account_number || 'N/A'],
      ["Bank IFSC Code", profile.bank_ifsc_code || 'N/A'],
      ["Nominee Name", profile.nominee_name || 'N/A'],
      ["Nominee Relationship", profile.nominee_relationship || 'N/A'],
      ["Nominee DOB", profile.nominee_dob ? format(new Date(profile.nominee_dob), 'PPP') : 'N/A'],
    ];

    exportToPdf(filename, title, headers, data.map(row => [row[0], String(row[1])]), profile.full_name || "User");
    toast.success("Profile downloaded as PDF.");
  };

  if (isLoading) {
    return <div className="flex h-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (isError) {
    return <div className="text-red-500">Error loading profile: {error.message}</div>;
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Profile</h1>
          <p className="text-muted-foreground">
            Manage your personal information, bank details, and KYC status.
          </p>
        </div>
        <Button variant="outline" onClick={handleDownloadProfile}>
          <Download className="mr-2 h-4 w-4" /> Download Profile
        </Button>
      </div>
      
      <div className="mt-6">
        <ProfileCompleteness profile={profile} />
        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6">
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