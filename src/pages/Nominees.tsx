import { NomineeManager } from "@/components/admin/NomineeManager";
import { useAuth } from "@/components/auth/AuthProvider";

export default function Nominees() {
  const { user } = useAuth();
  return <NomineeManager userId={user?.id} />;
}