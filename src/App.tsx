import { createClient } from "@/integrations/supabase/client";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import AdminDepositsPage from "./pages/admin/Deposits";
import { Toaster } from "@/components/ui/sonner"

function App() {
  const supabase = createClient();

  return (
    <SessionContextProvider supabaseClient={supabase}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/admin/deposits" element={<AdminDepositsPage />} />
        </Routes>
      </BrowserRouter>
      <Toaster />
    </SessionContextProvider>
  );
}

export default App;