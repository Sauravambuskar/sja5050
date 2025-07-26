import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PersonalDetailsForm from "@/components/profile/PersonalDetailsForm";
import NomineeDetailsForm from "@/components/profile/NomineeDetailsForm";
import KycDocuments from "@/components/profile/KycDocuments";

const Profile = () => {
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Profile</h1>
      </div>
      <p className="text-muted-foreground">
        Manage your personal information, nominee details, and KYC documents.
      </p>

      <Tabs defaultValue="personal" className="mt-6">
        <TabsList className="grid w-full grid-cols-3 md:w-[500px]">
          <TabsTrigger value="personal">Personal Details</TabsTrigger>
          <TabsTrigger value="nominee">Nominee Details</TabsTrigger>
          <TabsTrigger value="kyc">KYC Documents</TabsTrigger>
        </TabsList>
        <TabsContent value="personal">
          <PersonalDetailsForm />
        </TabsContent>
        <TabsContent value="nominee">
          <NomineeDetailsForm />
        </TabsContent>
        <TabsContent value="kyc">
          <KycDocuments />
        </TabsContent>
      </Tabs>
    </>
  );
};
export default Profile;