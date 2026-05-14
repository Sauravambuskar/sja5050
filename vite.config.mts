import { defineConfig, splitVendorChunkPlugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "node:path";

const coreJsStubPath = path.resolve(__dirname, "./src/stubs/core-js-stub.js");

const coreJsEsbuildPlugin = {
  name: "core-js-stub",
  setup(build: any) {
    build.onResolve({ filter: /^core-js\// }, () => ({
      path: coreJsStubPath,
    }));
  },
};

export default defineConfig(() => ({
  appType: "spa",
  server: {
    host: "0.0.0.0",
    port: 5000,
    allowedHosts: true,
  },
  plugins: [
    react(),
    splitVendorChunkPlugin(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
  optimizeDeps: {
    esbuildOptions: {
      plugins: [coreJsEsbuildPlugin],
    },
  },
  build: {
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;

          if (id.includes("react") || id.includes("react-dom")) return "react";
          if (id.includes("react-router") || id.includes("@remix-run")) return "router";

          if (id.includes("@supabase")) return "supabase";
          if (id.includes("@tanstack")) return "tanstack";

          if (id.includes("@radix-ui")) return "radix";
          if (id.includes("lucide-react")) return "icons";

          if (id.includes("recharts") || id.includes("d3-")) return "charts";
          if (id.includes("jspdf") || id.includes("jspdf-autotable")) return "pdf";
          if (id.includes("xlsx")) return "xlsx";

          return "vendor";
        },
      },
    },
  },
}));
