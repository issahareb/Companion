import { Router } from "express";
import { fetchMemberships, fetchProfileState, transferItem, equipItem, pullFromPostmaster, setLockState, equipItems, insertSocketPlug, equipLoadout, snapshotLoadout, clearLoadout, fetchBungieNews, BungieApiError } from "../bungie";
import { handleBungieError, requireAuth } from "./shared";

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

const router = Router();

router.get('/api/bungie/news', async (_req, res) => {
  try {
    const language = (typeof _req.query.lang === 'string' ? _req.query.lang : 'en');
    const articles = await fetchBungieNews(language);
    res.json(articles);
  } catch (err: any) {
    console.error('[news] Failed to fetch Bungie news:', err.message);
    res.status(500).json({ message: 'Failed to fetch news' });
  }
});

router.get('/api/bungie/membership', requireAuth, async (req, res) => {
  try {
    const membership = await fetchMemberships(req.sessionAccessToken!);
    res.json(membership);
  } catch (err: any) {
    handleBungieError(err, res, 'Failed to fetch membership');
  }
});

const PROFILE_FIELDS = ['characters', 'vaultItems', 'postmasterItems', 'currencies', 'collectibles', 'records', 'artifact', 'inGameLoadouts'] as const;

router.get('/api/bungie/profile-state/:membershipType/:membershipId', requireAuth, async (req, res) => {
  try {
    const membershipType = req.params.membershipType as string;
    const membershipId = req.params.membershipId as string;
    const fresh = req.query.fresh === 'true';
    const cacheKey = `${membershipType}:${membershipId}`;

    if (!fresh) {
      const cached = getCachedProfile(cacheKey);
      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        const filtered = filterProfileFields(cached, req.query.include as string | undefined);
        return res.json(filtered);
      }
    }

    const state = await fetchProfileState(membershipType, membershipId, req.sessionAccessToken!);
    setCachedProfile(cacheKey, state);
    res.setHeader('X-Cache', 'MISS');
    const filtered = filterProfileFields(state, req.query.include as string | undefined);
    res.json(filtered);
  } catch (err: any) {
    handleBungieError(err, res, 'Failed to fetch profile state');
  }
});

function filterProfileFields(state: any, include?: string): any {
  if (!include) return state;
  const requested = new Set(include.split(',').map(s => s.trim()).filter(f => PROFILE_FIELDS.includes(f as any)));
  if (requested.size === 0) return state;
  const result: any = {};
  for (const field of requested) {
    if (field in state) result[field] = state[field];
  }
  return result;
}

router.post('/api/bungie/transfer', requireAuth, async (req, res) => {
  try {
    const result = await transferItem(req.body, req.sessionAccessToken!);
    invalidateProfileCaches(req.body.membershipType);
    res.json(result);
  } catch (err: any) {
    handleBungieError(err, res, 'Transfer failed');
  }
});

router.post('/api/bungie/equip', requireAuth, async (req, res) => {
  try {
    const result = await equipItem(req.body, req.sessionAccessToken!);
    invalidateProfileCaches(req.body.membershipType);
    res.json(result);
  } catch (err: any) {
    handleBungieError(err, res, 'Equip failed');
  }
});

router.post('/api/bungie/pull-postmaster', requireAuth, async (req, res) => {
  try {
    const result = await pullFromPostmaster(req.body, req.sessionAccessToken!);
    invalidateProfileCaches(req.body.membershipType);
    res.json(result);
  } catch (err: any) {
    handleBungieError(err, res, 'Pull from postmaster failed');
  }
});

router.post('/api/bungie/lock', requireAuth, async (req, res) => {
  try {
    const result = await setLockState(req.body, req.sessionAccessToken!);
    invalidateProfileCaches(req.body.membershipType);
    res.json(result);
  } catch (err: any) {
    handleBungieError(err, res, 'Lock state change failed');
  }
});

router.post('/api/bungie/equip-items', requireAuth, async (req, res) => {
  try {
    const result = await equipItems(req.body, req.sessionAccessToken!);
    invalidateProfileCaches(req.body.membershipType);
    res.json(result);
  } catch (err: any) {
    handleBungieError(err, res, 'Batch equip failed');
  }
});

router.post('/api/bungie/insert-plug', requireAuth, async (req, res) => {
  try {
    const result = await insertSocketPlug(req.body, req.sessionAccessToken!);
    invalidateProfileCaches(req.body.membershipType);
    res.json(result);
  } catch (err: any) {
    if (err instanceof BungieApiError && err.errorCode) {
      const plugErrors: Record<number, string> = {
        1671: 'This mod requires materials you do not have.',
        1672: 'This plug socket is not available for free insertion.',
        1076: 'The item cannot accept this mod in its current state.',
      };
      const specificMsg = plugErrors[err.errorCode];
      if (specificMsg) {
        return res.status(400).json({ message: specificMsg, errorType: err.errorType, errorCode: err.errorCode });
      }
    }
    handleBungieError(err, res, 'Insert plug failed');
  }
});

router.post('/api/bungie/equip-loadout', requireAuth, async (req, res) => {
  try {
    const result = await equipLoadout(req.body, req.sessionAccessToken!);
    invalidateProfileCaches(req.body.membershipType);
    res.json(result);
  } catch (err: any) {
    handleBungieError(err, res, 'Equip loadout failed');
  }
});

router.post('/api/bungie/snapshot-loadout', requireAuth, async (req, res) => {
  try {
    const result = await snapshotLoadout(req.body, req.sessionAccessToken!);
    invalidateProfileCaches(req.body.membershipType);
    res.json(result);
  } catch (err: any) {
    handleBungieError(err, res, 'Snapshot loadout failed');
  }
});

router.post('/api/bungie/clear-loadout', requireAuth, async (req, res) => {
  try {
    const result = await clearLoadout(req.body, req.sessionAccessToken!);
    invalidateProfileCaches(req.body.membershipType);
    res.json(result);
  } catch (err: any) {
    handleBungieError(err, res, 'Clear loadout failed');
  }
});

export default router;
