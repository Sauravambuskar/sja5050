import React from 'react';

export const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="w-full min-h-screen bg-black lg:grid lg:bg-background lg:grid-cols-2">
      <div className="bg-black">
        <img
          src="https://png.pngtree.com/background/20250107/original/pngtree-hands-holding-money-green-investment-wealth-growth-concept-picture-image_16144123.jpg"
          alt="An abstract image representing finance and growth"
          className="h-48 w-full object-cover lg:h-full dark:brightness-[0.2] dark:grayscale"
        />
      </div>
      <div className="flex items-center justify-center p-6">
        {children}
      </div>
    </div>
  );
};