import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { ThemeProvider } from "./components/layout/ThemeProvider";
import { AuthProvider } from "./components/auth/AuthProvider";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider defaultTheme="system" storageKey="sja-ui-theme">
    <AuthProvider>
      <App />
    </AuthProvider>
  </ThemeProvider>
);