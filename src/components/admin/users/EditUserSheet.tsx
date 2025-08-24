import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { AdminUserView } from "@/types/database";

export const EditUserSheet = ({ user, isOpen, onOpenChange }: { user: AdminUserView | null; isOpen: boolean; onOpenChange: (open: boolean) => void; }) => {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Edit User</SheetTitle>
          <SheetDescription>
            Editing profile for {user?.full_name || 'user'}.
          </SheetDescription>
        </SheetHeader>
        <div className="py-4">
          {/* Form to edit user details will go here */}
          <p>Edit form placeholder.</p>
        </div>
      </SheetContent>
    </Sheet>
  );
};