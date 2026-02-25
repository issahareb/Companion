import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { exchangeToken, fetchMemberships, fetchProfileState, transferItem, equipItem, pullFromPostmaster, setLockState, equipItems, insertSocketPlug } from "./bungie";

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

  app.get('/api/bungie/profile-state/:membershipType/:membershipId', async (req, res) => {
    try {
      const { membershipType, membershipId } = req.params;
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.replace('Bearer ', '') || '';
      if (!accessToken) {
        return res.status(401).json({ message: 'Access token required' });
      }
      const state = await fetchProfileState(membershipType, membershipId, accessToken);
      res.json(state);
    } catch (err: any) {
      console.error('[bungie profile-state error]', err.message);
      res.status(502).json({ message: 'Failed to fetch profile state', error: err.message });
    }
  });

  app.post('/api/bungie/transfer', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.replace('Bearer ', '') || '';
      if (!accessToken) {
        return res.status(401).json({ message: 'Access token required' });
      }
      const result = await transferItem(req.body, accessToken);
      res.json(result);
    } catch (err: any) {
      console.error('[bungie transfer error]', err.message);
      res.status(502).json({ message: err.message || 'Transfer failed' });
    }
  });

  app.post('/api/bungie/equip', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.replace('Bearer ', '') || '';
      if (!accessToken) {
        return res.status(401).json({ message: 'Access token required' });
      }
      const result = await equipItem(req.body, accessToken);
      res.json(result);
    } catch (err: any) {
      console.error('[bungie equip error]', err.message);
      res.status(502).json({ message: err.message || 'Equip failed' });
    }
  });

  app.post('/api/bungie/pull-postmaster', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.replace('Bearer ', '') || '';
      if (!accessToken) {
        return res.status(401).json({ message: 'Access token required' });
      }
      const result = await pullFromPostmaster(req.body, accessToken);
      res.json(result);
    } catch (err: any) {
      console.error('[bungie pull-postmaster error]', err.message);
      res.status(502).json({ message: err.message || 'Pull from postmaster failed' });
    }
  });

  app.post('/api/bungie/lock', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.replace('Bearer ', '') || '';
      if (!accessToken) {
        return res.status(401).json({ message: 'Access token required' });
      }
      const result = await setLockState(req.body, accessToken);
      res.json(result);
    } catch (err: any) {
      console.error('[bungie lock error]', err.message);
      res.status(502).json({ message: err.message || 'Lock state change failed' });
    }
  });

  app.post('/api/bungie/equip-items', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.replace('Bearer ', '') || '';
      if (!accessToken) {
        return res.status(401).json({ message: 'Access token required' });
      }
      const result = await equipItems(req.body, accessToken);
      res.json(result);
    } catch (err: any) {
      console.error('[bungie equip-items error]', err.message);
      res.status(502).json({ message: err.message || 'Batch equip failed' });
    }
  });

  app.post('/api/bungie/insert-plug', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.replace('Bearer ', '') || '';
      if (!accessToken) {
        return res.status(401).json({ message: 'Access token required' });
      }
      const result = await insertSocketPlug(req.body, accessToken);
      res.json(result);
    } catch (err: any) {
      console.error('[bungie insert-plug error]', err.message);
      res.status(502).json({ message: err.message || 'Insert plug failed' });
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

  app.delete('/api/loadouts/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: 'Invalid loadout ID' });
      }
      const deleted = await storage.deleteLoadout(id);
      if (!deleted) {
        return res.status(404).json({ message: 'Loadout not found' });
      }
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ message: 'Failed to delete loadout' });
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
