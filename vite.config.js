import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [
    react(),
    {
      name: "route-and-asset-rewrites",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.startsWith("/assets/") && !req.url.startsWith("/order_now/assets/")) {
            req.url = `/order_now${req.url}`;
          }
          next();
        });
      },
    },
  ],

  base: "/order_now/",

  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
      },
    },
  },

  server: {
    host: true,
    allowedHosts: true,
  },
});