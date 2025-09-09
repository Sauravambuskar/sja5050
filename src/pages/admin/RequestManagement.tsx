import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DepositRequestsTab } from "@/components/admin/requests/DepositRequestsTab";
import { ArrowDownToDot, ArrowRightLeft } from "lucide-react";
import { BalanceTransferRequestsTab } from "@/components/admin/requests/BalanceTransferRequestsTab";

const RequestManagement = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Request Management</CardTitle>
        <CardDescription>Approve or reject user deposit and transfer requests.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="deposits" className="w-full mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="deposits">
              <ArrowDownToDot className="mr-2 h-4 w-4" />
              Deposit Requests
            </TabsTrigger>
            <TabsTrigger value="transfers">
              <ArrowRightLeft className="mr-2 h-4 w-4" />
              Balance Transfers
            </TabsTrigger>
          </TabsList>
          <TabsContent value="deposits">
            <DepositRequestsTab />
          </TabsContent>
          <TabsContent value="transfers">
            <BalanceTransferRequestsTab />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default RequestManagement;