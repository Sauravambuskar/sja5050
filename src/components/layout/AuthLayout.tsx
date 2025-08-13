import React from 'react';

export const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="light w-full min-h-screen bg-muted lg:grid lg:grid-cols-2">
      <div className="hidden lg:block">
        <img
          src="https://png.pngtree.com/background/20250107/original/pngtree-hands-holding-money-green-investment-wealth-growth-concept-picture-image_16144123.jpg"
          alt="An abstract image representing finance and growth"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex h-screen items-center justify-center p-6 lg:h-auto">
        {children}
      </div>
    </div>
  );
};