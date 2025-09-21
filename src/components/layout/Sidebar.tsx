import { SidebarNav } from "./SidebarNav";
import { useAuth } from "../auth/AuthProvider";

export function Sidebar({ className }: { className?: string }) {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';

  return (
    <div className={className}>
      <div className="mb-12 flex h-10 items-center p-2">
        <img 
          src="https://i.ibb.co/V0ws00DB/SJALAND.png" 
          alt="Company Logo" 
          className="h-full w-auto object-contain" 
        />
      </div>
      <SidebarNav isAdmin={isAdmin} />
    </div>
  );
}