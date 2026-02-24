import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get(api.loadouts.list.path, async (req, res) => {
    const bungieMembershipId = req.params.bungieMembershipId;
    const loadouts = await storage.getLoadouts(bungieMembershipId);
    res.json(loadouts);
  });

  app.post(api.loadouts.create.path, async (req, res) => {
    try {
      const input = api.loadouts.create.input.parse(req.body);
      const loadout = await storage.createLoadout(input);
      res.status(201).json(loadout);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  return httpServer;
}