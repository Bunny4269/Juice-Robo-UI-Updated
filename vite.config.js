import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = fileURLToPath(
  new URL(".", import.meta.url)
);

export default defineConfig({
  plugins: [
    react(),

    {
      name: "route-and-asset-rewrites",

      configureServer(server) {
        server.middlewares.use(
          (req, res, next) => {
            if (
              req.url &&
              (
                req.url.includes(
                  "/__debug_log"
                ) ||
                req.url ===
                  "/__debug_log"
              )
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

              if (
                req.method ===
                "OPTIONS"
              ) {
                res.writeHead(200);
                res.end();
                return;
              }

              let body = "";

              req.on(
                "data",
                (chunk) => {
                  body += chunk;
                }
              );

              req.on(
                "end",
                () => {
                  console.log(
                    "\n======================================================="
                  );

                  console.log(
                    "[Juice Robo BROWSER RUNTIME LOG]:"
                  );

                  try {
                    const parsed =
                      JSON.parse(body);

                    console.log(
                      JSON.stringify(
                        parsed,
                        null,
                        2
                      )
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
                    JSON.stringify({
                      ok: true,
                    })
                  );
                }
              );

              return;
            }

            if (
              req.url &&
              req.url.startsWith(
                "/assets/"
              ) &&
              !req.url.startsWith(
                "/order_now/assets/"
              )
            ) {
              req.url =
                `/order_now${req.url}`;
            }

            next();
          }
        );
      },
    },
  ],

  base: "/order_now/",

  build: {
    rollupOptions: {
      input: {
        main: resolve(
          __dirname,
          "index.html"
        ),
      },
    },
  },

  server: {
    host: true,

    allowedHosts: true,

    https: {
      key: fs.readFileSync(
        resolve(
          __dirname,
          "192.168.100.4+2-key.pem"
        )
      ),

      cert: fs.readFileSync(
        resolve(
          __dirname,
          "192.168.100.4+2.pem"
        )
      ),
    },
  },
});