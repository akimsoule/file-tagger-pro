import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Évite le warning pour des apps SPA un peu lourdes
    chunkSizeWarningLimit: 1024,
    rollupOptions: {
      output: {
        // Découpage vendor simple pour mieux répartir le poids
        manualChunks: {
          react: ["react", "react-dom"],
          router: ["react-router-dom"],
          query: ["@tanstack/react-query"],
          charts: ["recharts"],
          cmdk: ["cmdk"],
        },
      },
    },
  },
}));
