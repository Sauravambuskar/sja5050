"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface KycLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  currentStep: number;
  totalSteps: number;
  onNext?: () => void;
  onBack?: () => void;
  isNextDisabled?: boolean;
  isBackDisabled?: boolean;
  nextButtonText?: string;
}

export const KycLayout: React.FC<KycLayoutProps> = ({
  title,
  description,
  children,
  currentStep,
  totalSteps,
  onNext,
  onBack,
  isNextDisabled = false,
  isBackDisabled = false,
  nextButtonText = "Next",
}) => {
  const progressValue = ((currentStep - 1) / (totalSteps - 1)) * 100;

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-lg">
      <CardHeader className="pb-4">
        <div className="flex justify-between items-center mb-2">
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
          <span className="text-sm text-muted-foreground">Step {currentStep} of {totalSteps}</span>
        </div>
        <Progress value={progressValue} className="w-full h-2" />
        {description && <p className="text-sm text-muted-foreground mt-2">{description}</p>}
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {children}
        <div className="flex justify-between pt-4 border-t mt-6">
          <Button
            variant="outline"
            onClick={onBack}
            disabled={isBackDisabled || currentStep === 1}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          {onNext && (
            <Button onClick={onNext} disabled={isNextDisabled}>
              {nextButtonText} <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};