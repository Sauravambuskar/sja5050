import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NomineeDetailsForm = () => {
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>Nominee Information</CardTitle>
        <CardDescription>Designate a nominee for your investments.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="nominee-name">Nominee Full Name</Label>
            <Input id="nominee-name" defaultValue="Jane Doe" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="relationship">Relationship</Label>
            <Select defaultValue="spouse">
              <SelectTrigger id="relationship">
                <SelectValue placeholder="Select relationship" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spouse">Spouse</SelectItem>
                <SelectItem value="child">Child</SelectItem>
                <SelectItem value="parent">Parent</SelectItem>
                <SelectItem value="sibling">Sibling</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="nominee-dob">Nominee Date of Birth</Label>
            <Input id="nominee-dob" type="date" defaultValue="1992-08-15" />
          </div>
        </div>
        <Button>Save Nominee</Button>
      </CardContent>
    </Card>
  );
};

export default NomineeDetailsForm;