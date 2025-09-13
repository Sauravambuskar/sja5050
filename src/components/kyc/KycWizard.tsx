"use client";

import React, { useState } from 'react';
import { KycWelcomeStep } from './steps/KycWelcomeStep';
// Import other steps as they are created
// import { KycDocumentUploadStep } from './steps/KycDocumentUploadStep';
// import { KycVideoVerificationStep } from './steps/KycVideoVerificationStep';
// import { KycSignatureUploadStep } from './steps/KycSignatureUploadStep';
// import { KycReviewStep } from './steps/KycReviewStep';
// import { KycCompletionStep } from './steps/KycCompletionStep';

export const KycWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5; // Welcome, Documents, Video, Signature, Review/Complete

  const handleNext = () => {
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <KycWelcomeStep onNext={handleNext} />;
      // case 2:
      //   return <KycDocumentUploadStep onNext={handleNext} onBack={handleBack} />;
      // case 3:
      //   return <KycVideoVerificationStep onNext={handleNext} onBack={handleBack} />;
      // case 4:
      //   return <KycSignatureUploadStep onNext={handleNext} onBack={handleBack} />;
      // case 5:
      //   return <KycReviewStep onNext={handleNext} onBack={handleBack} />;
      // case 6:
      //   return <KycCompletionStep />;
      default:
        return <KycWelcomeStep onNext={handleNext} />;
    }
  };

  return (
    <div className="container mx-auto py-8">
      {renderStep()}
    </div>
  );
};