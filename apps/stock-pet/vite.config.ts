import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Electron loads the renderer with file:// in packaged builds. Relative
  // assets keep scripts, styles and images inside the application bundle.
  base: "./",
  plugins: [react()],
});
