import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { ThemeProvider } from "./components/theme/ThemeProvider";
import { AuthProvider } from "./components/auth/AuthProvider";

createRoot(document.getElementById("root")!).render(
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
);