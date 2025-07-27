import { useAuth } from "@/hooks/useAuth";
import { Navigate, Outlet } from "react-router-dom";

export const AdminRoute = () => {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return null; // Or a loading spinner
  }

  return isAdmin ? <Outlet /> : <Navigate to="/" replace />;
};