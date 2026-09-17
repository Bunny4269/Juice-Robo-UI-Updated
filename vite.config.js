import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig({
  plugins: [
    react(),
    basicSsl(),
    {
      name: "redirect-root-to-base",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === "/" || req.url === "") {
            res.writeHead(302, { Location: "/order_now/" });
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
    host: true,
    port: 5174,
    https: true,
    allowedHosts: true,
  },
});