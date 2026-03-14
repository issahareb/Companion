import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import authRouter from "./routes/auth";
import bungieRouter from "./routes/bungie";
import loadoutRouter from "./routes/loadouts";
import aiRouter from "./routes/ai";
import premiumRouter from "./routes/premium";

declare global {
  namespace Express {
    interface Request {
      sessionAccessToken?: string;
      sessionMembershipId?: string;
    }
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.use(authRouter);
  app.use(bungieRouter);
  app.use(loadoutRouter);
  app.use(aiRouter);
  app.use(premiumRouter);

  setInterval(() => {
    storage.deleteExpiredSessions().catch(err => {
      console.error('[auth] Failed to clean expired sessions:', err);
    });
  }, 60 * 60 * 1000);

  return httpServer;
}
