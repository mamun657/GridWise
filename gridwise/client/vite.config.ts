import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/optimize-energy": "http://127.0.0.1:4000",
      "/sample-cases": "http://127.0.0.1:4000",
      "/health": "http://127.0.0.1:4000",
      "/docs": "http://127.0.0.1:4000",
      "/openapi.json": "http://127.0.0.1:4000",
    },
  },
  preview: {
    port: 5173,
    proxy: {
      "/optimize-energy": "http://127.0.0.1:4000",
      "/sample-cases": "http://127.0.0.1:4000",
      "/health": "http://127.0.0.1:4000",
      "/docs": "http://127.0.0.1:4000",
      "/openapi.json": "http://127.0.0.1:4000",
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
