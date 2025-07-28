import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./globals.css";
import { ThemeProvider } from "./components/theme/ThemeProvider";
import { AuthProvider } from "./components/auth/AuthProvider";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider
    attribute="class"
    forcedTheme="light"
  >
    <AuthProvider>
      <App />
    </AuthProvider>
  </ThemeProvider>
);