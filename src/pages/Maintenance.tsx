import { Wrench } from 'lucide-react';

interface MaintenancePageProps {
  message?: string | null;
}

const MaintenancePage = ({ message }: MaintenancePageProps) => {
  const defaultMessage = "We are currently performing scheduled maintenance and will be back online shortly. Thank you for your patience.";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-center p-4">
      <Wrench className="h-16 w-16 text-primary" />
      <h1 className="mt-6 text-4xl font-bold text-foreground">Under Maintenance</h1>
      <p className="mt-4 max-w-md text-lg text-muted-foreground">
        {message || defaultMessage}
      </p>
    </div>
  );
};

export default MaintenancePage;