import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite is dev/build only (spec 012, D-8): `vite dev` proxies /api to a running
// `relic serve`; `vite build` output is embedded into the CLI by
// scripts/embed-viewer.ts. Users never run Vite.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { "/api": "http://localhost:4747" },
  },
  build: { outDir: "dist" },
});
