import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { fetchInventory, exchangeToken, fetchMemberships } from "./bungie";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post('/api/bungie/token', async (req, res) => {
    try {
      const { code } = req.body;
      if (!code) {
        return res.status(400).json({ message: 'Authorization code required' });
      }
      const tokenData = await exchangeToken(code);
      res.json(tokenData);
    } catch (err: any) {
      console.error('[bungie token error]', err.message);
      res.status(502).json({ message: 'Failed to exchange token', error: err.message });
    }
  });

  app.get('/api/bungie/membership', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.replace('Bearer ', '') || '';
      if (!accessToken) {
        return res.status(401).json({ message: 'Access token required' });
      }
      const membership = await fetchMemberships(accessToken);
      res.json(membership);
    } catch (err: any) {
      console.error('[bungie membership error]', err.message);
      res.status(502).json({ message: 'Failed to fetch membership', error: err.message });
    }
  });

  app.get('/api/bungie/inventory/:membershipType/:membershipId', async (req, res) => {
    try {
      const { membershipType, membershipId } = req.params;
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.replace('Bearer ', '') || '';

      if (!accessToken) {
        return res.status(401).json({ message: 'Access token required' });
      }

      const inventory = await fetchInventory(membershipType, membershipId, accessToken);
      res.json(inventory);
    } catch (err: any) {
      console.error('[bungie inventory error]', err.message);
      res.status(502).json({ message: 'Failed to fetch inventory from Bungie', error: err.message });
    }
  });

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

  app.get(api.loadouts.getByShareCode.path, async (req, res) => {
    const shareCode = req.params.shareCode;
    const loadout = await storage.getLoadoutByShareCode(shareCode);
    if (!loadout) {
      return res.status(404).json({ message: "Loadout not found" });
    }
    res.json(loadout);
  });

  return httpServer;
}