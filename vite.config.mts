import { defineConfig, splitVendorChunkPlugin } from "vite";
import dyadComponentTagger from "@dyad-sh/react-vite-component-tagger";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

export default defineConfig(({ command }) => ({
  appType: "spa",
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
  },
  plugins: [
    // Dev-only helper (does not affect runtime bundle size)
    ...(command === "serve" ? [dyadComponentTagger()] : []),
    react(),
    // Stable vendor splitting for production builds
    splitVendorChunkPlugin(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Keep the warning threshold, but with proper code-splitting it should stop triggering.
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        // Manual chunking for large third-party libs.
        // This works best together with route-level code splitting (React.lazy in App.tsx).
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          // Core framework
          if (id.includes("react") || id.includes("react-dom")) return "react";
          if (id.includes("react-router") || id.includes("@remix-run")) return "router";

          // Data / auth
          if (id.includes("@supabase")) return "supabase";
          if (id.includes("@tanstack")) return "tanstack";

          // UI libs
          if (id.includes("@radix-ui")) return "radix";
          if (id.includes("lucide-react")) return "icons";

          // Heavy feature libraries (keep isolated)
          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("jspdf") || id.includes("jspdf-autotable")) return "pdf";
          if (id.includes("xlsx")) return "xlsx";

          return "vendor";
        },
      },
    },
  },
}));