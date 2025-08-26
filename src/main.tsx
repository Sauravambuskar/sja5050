import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { ThemeProvider } from "./components/theme/ThemeProvider";
import { AuthProvider } from "./components/auth/AuthProvider";
import "./lib/i18n";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

createRoot(document.getElementById("root")!).render(
  <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      // Ensure the class is always applied to the html element
      // This can sometimes help with initial rendering or hydration issues
      storageKey="vite-ui-theme" 
    >
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  </Suspense>
);