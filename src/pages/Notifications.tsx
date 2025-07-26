import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const notifications = [
  {
    icon: CheckCircle,
    color: "text-green-500",
    title: "KYC Approved",
    description: "Your KYC documents have been successfully verified.",
    time: "2 hours ago",
  },
  {
    icon: Bell,
    color: "text-blue-500",
    title: "New Investment Plan",
    description: "Check out the new 'Retirement Plus' plan with 15% annual returns.",
    time: "1 day ago",
  },
  {
    icon: XCircle,
    color: "text-red-500",
    title: "Withdrawal Failed",
    description: "Your withdrawal request of ₹5,000 failed due to incorrect PIN.",
    time: "3 days ago",
  },
];

const Notifications = () => {
  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Notifications</h1>
      </div>
      <p className="text-muted-foreground">
        Here are your recent alerts and updates.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>All your notifications will appear here.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {notifications.map((notification, index) => (
              <div key={index} className="flex items-start space-x-4 rounded-md border p-4">
                <notification.icon className={cn("h-6 w-6 flex-shrink-0", notification.color)} />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">{notification.title}</p>
                  <p className="text-sm text-muted-foreground">{notification.description}</p>
                </div>
                <p className="text-xs text-muted-foreground">{notification.time}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
};
export default Notifications;