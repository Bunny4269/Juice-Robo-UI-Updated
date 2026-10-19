import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { fileURLToPath } from "url";
import fs from "node:fs";

const __dirname = fileURLToPath(
  new URL(".", import.meta.url)
);

const certificatePath = fs.existsSync(resolve(__dirname, "certs", "192.168.6.12.pem"))
  ? resolve(__dirname, "certs", "192.168.6.12.pem")
  : fs.existsSync(resolve(__dirname, "certs", "192.168.100.6.pem"))
  ? resolve(__dirname, "certs", "192.168.100.6.pem")
  : resolve(__dirname, "certs", "localhost.pem");

const privateKeyPath = fs.existsSync(resolve(__dirname, "certs", "192.168.6.12-key.pem"))
  ? resolve(__dirname, "certs", "192.168.6.12-key.pem")
  : fs.existsSync(resolve(__dirname, "certs", "192.168.100.6-key.pem"))
  ? resolve(__dirname, "certs", "192.168.100.6-key.pem")
  : resolve(__dirname, "certs", "localhost-key.pem");

// Validate the HTTPS certificate files.
if (
  !fs.existsSync(certificatePath) ||
  !fs.existsSync(privateKeyPath)
) {
  throw new Error(
    "SSL certificate files are missing. Expected files:\n" +
      `${certificatePath}\n${privateKeyPath}`
  );
}

export default defineConfig({
  plugins: [
    react(),

    {
      name: "route-and-asset-rewrites",

      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // Handle browser runtime debug logs.
          if (
            req.url &&
            req.url.includes("/__debug_log")
          ) {
            res.setHeader(
              "Access-Control-Allow-Origin",
              "*"
            );

            res.setHeader(
              "Access-Control-Allow-Methods",
              "POST, OPTIONS"
            );

            res.setHeader(
              "Access-Control-Allow-Headers",
              "*"
            );

            if (req.method === "OPTIONS") {
              res.writeHead(200);
              res.end();
              return;
            }

            let body = "";

            req.on("data", (chunk) => {
              body += chunk;
            });

            req.on("end", () => {
              console.log(
                "\n======================================================="
              );

              console.log(
                "[Juice Robo BROWSER RUNTIME LOG]:"
              );

              try {
                const parsed = JSON.parse(body);

                console.log(
                  JSON.stringify(parsed, null, 2)
                );
              } catch {
                console.log(body);
              }

              console.log(
                "=======================================================\n"
              );

              res.setHeader(
                "Content-Type",
                "application/json"
              );

              res.end(
                JSON.stringify({ ok: true })
              );
            });

            return;
          }

          // Rewrite root-level asset requests to the app base path.
          if (
            req.url &&
            req.url.startsWith("/assets/") &&
            !req.url.startsWith("/order_now/assets/")
          ) {
            req.url = `/order_now${req.url}`;
          }

          next();
        });
      },
    },
  ],

  // Application is hosted under /order_now/.
  base: "/order_now/",

  // Production build configuration.
  build: {
    // Remove the warning for bundles below 600 kB.
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
      },
    },
  },

  // HTTPS development server and LAN access.
  server: {
    host: "0.0.0.0",

    allowedHosts: true,

    https: {
      key: fs.readFileSync(privateKeyPath),
      cert: fs.readFileSync(certificatePath),
    },
  },
});