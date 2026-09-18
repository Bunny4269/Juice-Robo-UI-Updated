import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),

    {
      name: "redirect-root-to-base",

      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === "/" || req.url === "") {
            res.writeHead(302, {
              Location: "/order_now/",
            });

            res.end();
            return;
          }

          next();
        });
      },
    },
  ],

  base: "/order_now/",

  server: {
    host: "0.0.0.0",
    port: 5174,
    allowedHosts: true,
  },
});