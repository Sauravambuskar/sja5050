import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const KycManagement = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>KYC Management</CardTitle>
        <CardDescription>Manage user KYC documents and statuses.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>KYC Management content will go here.</p>
      </CardContent>
    </Card>
  );
};

export default KycManagement;