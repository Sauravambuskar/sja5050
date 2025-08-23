import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const Index = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-lg text-center">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Welcome to Your Application</CardTitle>
          <CardDescription className="text-md text-muted-foreground">
            This is the starting point. You can navigate to other pages from here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link to="/register">Register</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/admin/deposits">Admin Deposits</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;