import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-center">
      <h1 className="text-9xl font-bold text-primary">404</h1>
      <h2 className="mt-4 text-2xl font-semibold text-foreground">Page Not Found</h2>
      <p className="mt-2 text-muted-foreground">
        Sorry, the page you are looking for does not exist.
      </p>
      <Button asChild className="mt-6">
        <Link to="/">Return to Home</Link>
      </Button>
    </div>
  );
};

export default NotFound;