import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// niceTerminal — Vite config for the Tauri frontend.
// The dev-server port (1420) is referenced by src-tauri/tauri.conf.json (devUrl).
export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    // WebView2 is Chromium — a recent baseline is fine.
    target: "chrome105",
    minify: "esbuild",
  },
});
