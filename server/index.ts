// server/index.ts
import "dotenv/config";

import express, { type Request, type Response, type NextFunction } from "express";
import { createServer } from "http";
import path from "path";

import { registerRoutes } from "./routes";
import { serveStatic } from "./static";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Stripe webhooks require raw body for signature verification
app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

/**
 * Safer request logging:
 * - DO NOT log full response bodies (can leak PII/secrets)
 * - Keep it useful: method, path, status, duration
 */
app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;

    if (reqPath.startsWith("/api")) {
      log(`${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`);

      if (res.statusCode >= 500) {
        log(`Server error on ${req.method} ${reqPath}`, "error");
      }
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  // Error handler (don’t throw after sending response — can crash the server)
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err?.status || err?.statusCode || 500;
    const message = err?.message || "Internal Server Error";

    console.error("Unhandled error:", message);

    res.status(status).json({ message });
  });

  /**
   * Static files / Vite:
   * - Production: serve built client via serveStatic(app)
   * - Dev: use Vite middleware, AND also serve client/public (favicon, og images, etc.)
   */
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    // ✅ Serve client/public in dev so /favicon.png and /opengraph.jpg work
    const publicDir = path.resolve(process.cwd(), "client", "public");
    app.use(express.static(publicDir));

    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);

  // Use localhost in dev (Windows friendliness); all interfaces in prod (Render)
  const host = process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1";

  httpServer.listen(port, host, () => {
    log(`serving on http://${host}:${port}`);
  });
})();
