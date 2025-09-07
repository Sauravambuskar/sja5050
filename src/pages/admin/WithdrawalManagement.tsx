import { useSearchParams } from "react-router-dom";
import { UnifiedWithdrawalsTab } from "@/components/admin/requests/UnifiedWithdrawalsTab";

const WithdrawalManagement = () => {
  const [searchParams] = useSearchParams();
  const status = searchParams.get("status");

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Withdrawal Management</h1>
          <p className="text-muted-foreground">
            Review and process all user withdrawal requests from a single, unified view.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <UnifiedWithdrawalsTab initialStatus={status} />
      </div>
    </>
  );
};

export default WithdrawalManagement;