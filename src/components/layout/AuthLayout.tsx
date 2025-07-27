import React from 'react';

export const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      <div className="hidden bg-muted lg:block">
        <img
          src="https://images.unsplash.com/photo-1583342831138-1c3a42c49498?q=80&w=1974&auto=format&fit=crop"
          alt="An abstract image representing finance and growth"
          className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
        />
      </div>
      <div className="flex items-center justify-center p-6">
        {children}
      </div>
    </div>
  );
};