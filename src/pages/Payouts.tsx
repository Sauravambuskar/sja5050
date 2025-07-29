import PayoutsTable from "@/components/payouts/PayoutsTable";

const Payouts = () => {
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Payout Details</h1>
      </div>
      <p className="text-muted-foreground">
        A detailed history of your commission payouts.
      </p>

      <div className="mt-6">
        <PayoutsTable />
      </div>
    </>
  );
};
export default Payouts;