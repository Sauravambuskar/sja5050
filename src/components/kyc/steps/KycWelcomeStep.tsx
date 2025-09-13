"use client";

import React from 'react';
import { KycLayout } from '../KycLayout';
import { CheckCircle, User, Briefcase, FileText } from 'lucide-react';

interface KycWelcomeStepProps {
  onNext: () => void;
}

export const KycWelcomeStep: React.FC<KycWelcomeStepProps> = ({ onNext }) => {
  return (
    <KycLayout
      title="Welcome to V-KYC Portal"
      description="Instructions before starting your KYC journey."
      currentStep={1}
      totalSteps={5} // Assuming 5 steps for now: Welcome, Documents, Video, Signature, Review/Complete
      onNext={onNext}
      nextButtonText="Start KYC"
    >
      <div className="space-y-4">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 p-2 bg-blue-100 rounded-full">
            <User className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h4 className="font-semibold text-lg">Basic Details</h4>
            <p className="text-sm text-muted-foreground">
              Join the call & show your PAN as directed.
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 p-2 bg-green-100 rounded-full">
            <Briefcase className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h4 className="font-semibold text-lg">Business Details</h4>
            <p className="text-sm text-muted-foreground">
              Follow the instructions till official captures the details.
            </p>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 p-2 bg-purple-100 rounded-full">
            <FileText className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h4 className="font-semibold text-lg">Complete your KYC</h4>
            <p className="text-sm text-muted-foreground">
              Answer the questions asked by official for verification.
            </p>
          </div>
        </div>
      </div>
    </KycLayout>
  );
};