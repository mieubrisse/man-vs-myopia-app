import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import viteFastify from "@fastify/vite/plugin";
import { resolve } from "node:path";

// https://vitejs.dev/config/
export default defineConfig({
  root: resolve(import.meta.dirname, "client"),
  plugins: [
    viteFastify({
      clientModule: "/src/main.tsx",
    }),
    react(),
  ],
  server: {
    host: "0.0.0.0",
    port: 5173,
  },
});
