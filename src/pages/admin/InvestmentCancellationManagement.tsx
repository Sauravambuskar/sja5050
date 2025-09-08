import { CancellationRequestsTab } from "@/components/admin/requests/CancellationRequestsTab";

const InvestmentCancellationManagement = () => {
  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Investment Cancellations</h1>
          <p className="text-muted-foreground">
            Review and process user requests to cancel active investments.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <CancellationRequestsTab />
      </div>
    </>
  );
};

export default InvestmentCancellationManagement;