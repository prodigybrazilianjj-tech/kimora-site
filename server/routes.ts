// server/routes.ts
import type { Express } from "express";
import type { Server } from "http";

import { registerAdminRoutes } from "./routes/adminRoutes";
import { registerCheckoutRoutes } from "./routes/checkoutRoutes";
import { registerPortalRoutes } from "./routes/portalRoutes";
import { registerWebhookRoutes } from "./routes/webhookRoutes";
import { registerWholesaleRoutes } from "./routes/wholesaleRoutes";
import { registerWaitlistRoutes } from "./routes/waitlistRoutes";
import { registerEmailCaptureRoutes } from "./routes/emailCaptureRoutes";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  registerAdminRoutes(app);
  registerCheckoutRoutes(app);
  registerWebhookRoutes(app);
  registerPortalRoutes(app);
  registerWholesaleRoutes(app);
  registerWaitlistRoutes(app);
  registerEmailCaptureRoutes(app);

  return httpServer;
}