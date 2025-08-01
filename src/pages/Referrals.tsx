import ReferralCode from "@/components/referrals/ReferralCode";
import ReferralGraph from "@/components/referrals/ReferralGraph";
import CommissionAnalytics from "@/components/referrals/CommissionAnalytics";
import DirectReferralsList from "@/components/referrals/DirectReferralsList";
import CommissionRulesTable from "@/components/referrals/CommissionRulesTable";

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
        <CommissionRulesTable />
        <DirectReferralsList />
        <CommissionAnalytics />
        <ReferralGraph />
      </div>
    </>
  );
};
export default Referrals;