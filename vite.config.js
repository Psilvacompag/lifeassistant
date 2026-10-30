import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// GitHub Pages sirve el sitio en /lifeassistant/; con dominio propio esto pasa a "/".
const base = process.env.LA_BASE ?? "/lifeassistant/";

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "LifeAssistant",
        short_name: "LifeAssistant",
        description: "Tu asistente personal",
        lang: "es-CL",
        start_url: base,
        scope: base,
        display: "standalone",
        background_color: "#faf6ee",
        theme_color: "#233a5e",
        icons: [{ src: "icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any maskable" }],
      },
      // La API nunca se cachea: solo el "cascarón" de la app.
      workbox: { navigateFallbackDenylist: [/^\/api/], runtimeCaching: [] },
    }),
  ],
});
