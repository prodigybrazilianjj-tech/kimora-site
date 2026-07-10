// server/index.ts
import "dotenv/config";

import express, { type Request, type Response, type NextFunction } from "express";
import { createServer } from "http";
import path from "path";

import { registerRoutes } from "./routes";
import { serveStatic } from "./static";

const app = express();

// Don't advertise the framework/version (minor info-disclosure hardening).
app.disable("x-powered-by");

const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Stripe webhooks require raw body for signature verification
app.use(
  express.json({
    // Allow inline cert image/PDF uploads (base64) on the admin resale-cert tool.
    // Base64 inflates ~33%, so 10mb here comfortably covers the ~6MB file cap.
    limit: "10mb",
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

/**
 * Security headers.
 *
 * Applied to every response (API, static files, and the SPA) since this runs
 * before route/static registration. These are the low-risk, always-safe headers.
 *
 * The Content-Security-Policy is intentionally shipped in REPORT-ONLY mode: it
 * does not block anything yet, it only logs violations to the browser console.
 * This lets us confirm the allow-list below covers everything the site actually
 * loads (Google Fonts, GTM/GA, TikTok pixel, Facebook pixel, Stripe checkout)
 * before promoting it to an enforcing `Content-Security-Policy` header.
 */
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  // GTM/GA + TikTok + Facebook pixels. 'unsafe-inline' kept for now because GTM
  // injects inline snippets; tighten to nonces when we enforce.
  "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://analytics.tiktok.com https://connect.facebook.net",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  // Pixels and product imagery; https: kept broad for analytics beacons.
  "img-src 'self' data: https:",
  "connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://analytics.tiktok.com https://connect.facebook.net https://www.facebook.com",
  // Stripe checkout is a full-page redirect, so form-action allows it.
  "form-action 'self' https://checkout.stripe.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

app.use((_req, res, next) => {
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains",
  );
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  );
  res.setHeader("Content-Security-Policy-Report-Only", CSP_REPORT_ONLY);
  next();
});

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