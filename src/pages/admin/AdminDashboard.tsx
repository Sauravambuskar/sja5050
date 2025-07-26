const AdminDashboard = () => {
  return (
    <div>
      <h1 className="text-3xl font-bold">Admin Dashboard</h1>
      <p className="text-muted-foreground">Overview of platform KPIs and activities.</p>
      <div className="mt-6 rounded-lg border bg-card p-8 text-center text-muted-foreground">
        Admin KPIs (AUM, Pending KYC, etc.) will be displayed here.
      </div>
    </div>
  );
};
export default AdminDashboard;