import { Outlet } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { Header } from "./Header";

export function AdminLayout() {
  return (
    <div className="grid min-h-screen w-full md:grid-cols-[256px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <AdminSidebar className="w-full" />
      </div>
      <div className="flex flex-col">
        <Header />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}