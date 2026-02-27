import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { exchangeToken, fetchMemberships, fetchProfileState, transferItem, equipItem, pullFromPostmaster, setLockState, equipItems, insertSocketPlug, equipLoadout, snapshotLoadout, clearLoadout, BungieApiError } from "./bungie";

interface CacheEntry {
  data: any;
  timestamp: number;
}

const PROFILE_CACHE_TTL = 30 * 1000;
const profileCache = new Map<string, CacheEntry>();

function getCachedProfile(key: string): any | null {
  const entry = profileCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > PROFILE_CACHE_TTL) {
    profileCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCachedProfile(key: string, data: any): void {
  profileCache.set(key, { data, timestamp: Date.now() });
  if (profileCache.size > 100) {
    const oldest = [...profileCache.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp)[0];
    if (oldest) profileCache.delete(oldest[0]);
  }
}

function invalidateProfileCaches(membershipType?: number) {
  if (membershipType) {
    for (const key of profileCache.keys()) {
      if (key.startsWith(`${membershipType}:`)) {
        profileCache.delete(key);
      }
    }
  } else {
    profileCache.clear();
  }
}

function handleBungieError(err: any, res: any, defaultMessage: string) {
  if (err instanceof BungieApiError) {
    const status = err.errorType === 'auth' ? 401
      : err.errorType === 'maintenance' ? 503
      : err.errorType === 'rate_limit' ? 429
      : err.errorType === 'timeout' ? 504
      : 502;
    return res.status(status).json({
      message: err.message,
      errorType: err.errorType,
      errorCode: err.errorCode,
    });
  }
  console.error(`[bungie] ${defaultMessage}:`, err.message);
  res.status(502).json({ message: err.message || defaultMessage });
}

async function verifyTurnstileToken(token: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret, response: token }),
    });
    const data = await response.json() as { success: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.get('/api/config/turnstile', (_req, res) => {
    const siteKey = process.env.TURNSTILE_SITE_KEY || '';
    res.json({ enabled: !!siteKey, siteKey });
  });

  app.post('/api/verify-turnstile', async (req, res) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ success: false, message: 'Token required' });
      }
      const valid = await verifyTurnstileToken(token);
      res.json({ success: valid });
    } catch {
      res.status(500).json({ success: false, message: 'Verification failed' });
    }
  });

  app.post('/api/bungie/token', async (req, res) => {
    try {
      const { code, turnstileToken } = req.body;
      if (!code) {
        return res.status(400).json({ message: 'Authorization code required' });
      }
      if (process.env.TURNSTILE_SECRET_KEY) {
        if (!turnstileToken) {
          return res.status(403).json({ message: 'CAPTCHA verification required' });
        }
        const valid = await verifyTurnstileToken(turnstileToken);
        if (!valid) {
          return res.status(403).json({ message: 'CAPTCHA verification failed' });
        }
      }
      const tokenData = await exchangeToken(code);
      res.json(tokenData);
    } catch (err: any) {
      handleBungieError(err, res, 'Failed to exchange token');
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
      handleBungieError(err, res, 'Failed to fetch membership');
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

      const fresh = req.query.fresh === 'true';
      const cacheKey = `${membershipType}:${membershipId}`;

      if (!fresh) {
        const cached = getCachedProfile(cacheKey);
        if (cached) {
          res.setHeader('X-Cache', 'HIT');
          return res.json(cached);
        }
      }

      const state = await fetchProfileState(membershipType, membershipId, accessToken);
      setCachedProfile(cacheKey, state);
      res.setHeader('X-Cache', 'MISS');
      res.json(state);
    } catch (err: any) {
      handleBungieError(err, res, 'Failed to fetch profile state');
    }
  });

  app.post('/api/bungie/transfer', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.replace('Bearer ', '') || '';
      if (!accessToken) {
        return res.status(401).json({ message: 'Access token required' });
      }
      invalidateProfileCaches(req.body.membershipType);
      const result = await transferItem(req.body, accessToken);
      res.json(result);
    } catch (err: any) {
      handleBungieError(err, res, 'Transfer failed');
    }
  });

  app.post('/api/bungie/equip', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.replace('Bearer ', '') || '';
      if (!accessToken) {
        return res.status(401).json({ message: 'Access token required' });
      }
      invalidateProfileCaches(req.body.membershipType);
      const result = await equipItem(req.body, accessToken);
      res.json(result);
    } catch (err: any) {
      handleBungieError(err, res, 'Equip failed');
    }
  });

  app.post('/api/bungie/pull-postmaster', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.replace('Bearer ', '') || '';
      if (!accessToken) {
        return res.status(401).json({ message: 'Access token required' });
      }
      invalidateProfileCaches(req.body.membershipType);
      const result = await pullFromPostmaster(req.body, accessToken);
      res.json(result);
    } catch (err: any) {
      handleBungieError(err, res, 'Pull from postmaster failed');
    }
  });

  app.post('/api/bungie/lock', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.replace('Bearer ', '') || '';
      if (!accessToken) {
        return res.status(401).json({ message: 'Access token required' });
      }
      invalidateProfileCaches(req.body.membershipType);
      const result = await setLockState(req.body, accessToken);
      res.json(result);
    } catch (err: any) {
      handleBungieError(err, res, 'Lock state change failed');
    }
  });

  app.post('/api/bungie/equip-items', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.replace('Bearer ', '') || '';
      if (!accessToken) {
        return res.status(401).json({ message: 'Access token required' });
      }
      invalidateProfileCaches(req.body.membershipType);
      const result = await equipItems(req.body, accessToken);
      res.json(result);
    } catch (err: any) {
      handleBungieError(err, res, 'Batch equip failed');
    }
  });

  app.post('/api/bungie/insert-plug', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.replace('Bearer ', '') || '';
      if (!accessToken) {
        return res.status(401).json({ message: 'Access token required' });
      }
      invalidateProfileCaches(req.body.membershipType);
      const result = await insertSocketPlug(req.body, accessToken);
      res.json(result);
    } catch (err: any) {
      handleBungieError(err, res, 'Insert plug failed');
    }
  });

  app.post('/api/bungie/equip-loadout', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.replace('Bearer ', '') || '';
      if (!accessToken) {
        return res.status(401).json({ message: 'Access token required' });
      }
      invalidateProfileCaches(req.body.membershipType);
      const result = await equipLoadout(req.body, accessToken);
      res.json(result);
    } catch (err: any) {
      handleBungieError(err, res, 'Equip loadout failed');
    }
  });

  app.post('/api/bungie/snapshot-loadout', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.replace('Bearer ', '') || '';
      if (!accessToken) {
        return res.status(401).json({ message: 'Access token required' });
      }
      invalidateProfileCaches(req.body.membershipType);
      const result = await snapshotLoadout(req.body, accessToken);
      res.json(result);
    } catch (err: any) {
      handleBungieError(err, res, 'Snapshot loadout failed');
    }
  });

  app.post('/api/bungie/clear-loadout', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = authHeader?.replace('Bearer ', '') || '';
      if (!accessToken) {
        return res.status(401).json({ message: 'Access token required' });
      }
      invalidateProfileCaches(req.body.membershipType);
      const result = await clearLoadout(req.body, accessToken);
      res.json(result);
    } catch (err: any) {
      handleBungieError(err, res, 'Clear loadout failed');
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
