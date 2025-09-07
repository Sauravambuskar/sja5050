import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DepositRequestsTab } from "@/components/admin/requests/DepositRequestsTab";
import { ArrowDownToDot } from "lucide-react";

const RequestManagement = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Deposit Request Management</CardTitle>
        <CardDescription>Approve or reject user deposit requests.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="deposits" className="w-full mt-6">
          <TabsList className="grid w-full grid-cols-1">
            <TabsTrigger value="deposits">
              <ArrowDownToDot className="mr-2 h-4 w-4" />
              Deposit Requests
            </TabsTrigger>
          </TabsList>
          <TabsContent value="deposits">
            <Card>
              <CardHeader>
                <CardTitle>Deposit Requests</CardTitle>
                <CardDescription>Approve or reject user deposit requests.</CardDescription>
              </CardHeader>
              <CardContent>
                <DepositRequestsTab />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default RequestManagement;