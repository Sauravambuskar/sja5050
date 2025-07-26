import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const PersonalDetailsForm = () => {
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Personal Information</CardTitle>
        <CardDescription>Update your personal details here. Click save when you're done.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" defaultValue="John Doe" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" type="email" defaultValue="john.doe@example.com" disabled />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input id="phone" defaultValue="+91 98765 43210" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dob">Date of Birth</Label>
            <Input id="dob" type="date" defaultValue="1990-05-20" />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="address">Address</Label>
          <Input id="address" defaultValue="123, Main Street, Anytown" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" defaultValue="Mumbai" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" defaultValue="Maharashtra" />
            </div>
            <div className="space-y-2">
                <Label htmlFor="pincode">Pincode</Label>
                <Input id="pincode" defaultValue="400001" />
            </div>
        </div>
        <Button>Save Changes</Button>
      </CardContent>
    </Card>
  );
};

export default PersonalDetailsForm;