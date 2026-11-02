import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // MapLibre is most of the bundle. Its own chunk stays cached across deploys
    // that only change app code. It is ~1.1 MB minified (~300 kB gzipped).
    chunkSizeWarningLimit: 1200,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: "maplibre", test: /node_modules[\\/]maplibre-gl/ }],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:3001" },
  },
});
