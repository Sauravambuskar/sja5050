import React from 'react';

export const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="grid min-h-screen w-full lg:grid-cols-2">
      <div className="hidden bg-muted lg:block">
        <img
          src="https://png.pngtree.com/background/20250107/original/pngtree-hands-holding-money-green-investment-wealth-growth-concept-picture-image_16144123.jpg"
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