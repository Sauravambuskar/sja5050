import ReferralCode from "@/components/referrals/ReferralCode";
import ReferralTree from "@/components/referrals/ReferralTree";
import CommissionAnalytics from "@/components/referrals/CommissionAnalytics";

const Referrals = () => {
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Referrals</h1>
      </div>
      <p className="text-muted-foreground">
        View your personal code, tree view, and commission analytics.
      </p>

      <div className="mt-6 space-y-6">
        <ReferralCode />
        <CommissionAnalytics />
        <ReferralTree />
      </div>
    </>
  );
};
export default Referrals;