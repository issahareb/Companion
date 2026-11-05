import { Router } from "express";
import { z } from "zod";
import { fetchMemberships, fetchProfileState, transferItem, equipItem, pullFromPostmaster, setLockState, equipItems, insertSocketPlug, equipLoadout, snapshotLoadout, clearLoadout, fetchBungieNews, fetchActivityHistory, BungieApiError } from "../bungie";
import { handleBungieError, requireAuth } from "./shared";

const transferSchema = z.object({
  itemReferenceHash: z.number(),
  stackSize: z.number().int().min(1).default(1),
  transferToVault: z.boolean(),
  itemId: z.string(),
  characterId: z.string(),
  membershipType: z.string(),
});

const equipSchema = z.object({
  itemId: z.string(),
  characterId: z.string(),
  membershipType: z.string(),
});

const pullPostmasterSchema = z.object({
  itemReferenceHash: z.number(),
  stackSize: z.number().int().min(1).default(1),
  itemId: z.string(),
  characterId: z.string(),
  membershipType: z.string(),
});

const lockSchema = z.object({
  itemId: z.string(),
  characterId: z.string(),
  membershipType: z.string(),
  state: z.boolean(),
});

const equipItemsSchema = z.object({
  itemIds: z.array(z.string()).min(1).max(10),
  characterId: z.string(),
  membershipType: z.string(),
});

const insertPlugSchema = z.object({
  itemInstanceId: z.string(),
  socketIndex: z.number().int().min(0),
  socketArrayType: z.number().int(),
  plug: z.object({ plugItemHash: z.number() }),
  characterId: z.string(),
  membershipType: z.string(),
});

const equipLoadoutSchema = z.object({
  loadoutIndex: z.number().int().min(0),
  characterId: z.string(),
  membershipType: z.string(),
});

const snapshotLoadoutSchema = z.object({
  loadoutIndex: z.number().int().min(0),
  characterId: z.string(),
  membershipType: z.string(),
  colorHash: z.number().optional(),
  iconHash: z.number().optional(),
  nameHash: z.number().optional(),
  items: z.array(z.any()).optional(),
});

const clearLoadoutSchema = z.object({
  loadoutIndex: z.number().int().min(0),
  characterId: z.string(),
  membershipType: z.string(),
});

function validateBody<T>(schema: z.ZodSchema<T>) {
  return (req: any, res: any, next: any) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        message: result.error.errors[0]?.message || 'Invalid request body',
        field: result.error.errors[0]?.path?.join('.'),
      });
    }
    req.body = result.data;
    next();
  };
}

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

    if (!req.sessionMembershipId || req.sessionMembershipId !== membershipId) {
      return res.status(403).json({ message: 'Access denied: membership mismatch' });
    }

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

router.post('/api/bungie/transfer', requireAuth, validateBody(transferSchema), async (req, res) => {
  try {
    const result = await transferItem(req.body, req.sessionAccessToken!);
    invalidateProfileCaches(req.body.membershipType);
    res.json(result);
  } catch (err: any) {
    handleBungieError(err, res, 'Transfer failed');
  }
});

router.post('/api/bungie/equip', requireAuth, validateBody(equipSchema), async (req, res) => {
  try {
    const result = await equipItem(req.body, req.sessionAccessToken!);
    invalidateProfileCaches(req.body.membershipType);
    res.json(result);
  } catch (err: any) {
    handleBungieError(err, res, 'Equip failed');
  }
});

router.post('/api/bungie/pull-postmaster', requireAuth, validateBody(pullPostmasterSchema), async (req, res) => {
  try {
    const result = await pullFromPostmaster(req.body, req.sessionAccessToken!);
    invalidateProfileCaches(req.body.membershipType);
    res.json(result);
  } catch (err: any) {
    handleBungieError(err, res, 'Pull from postmaster failed');
  }
});

router.post('/api/bungie/lock', requireAuth, validateBody(lockSchema), async (req, res) => {
  try {
    const result = await setLockState(req.body, req.sessionAccessToken!);
    invalidateProfileCaches(req.body.membershipType);
    res.json(result);
  } catch (err: any) {
    handleBungieError(err, res, 'Lock state change failed');
  }
});

router.post('/api/bungie/equip-items', requireAuth, validateBody(equipItemsSchema), async (req, res) => {
  try {
    const result = await equipItems(req.body, req.sessionAccessToken!);
    invalidateProfileCaches(req.body.membershipType);
    res.json(result);
  } catch (err: any) {
    handleBungieError(err, res, 'Batch equip failed');
  }
});

router.post('/api/bungie/insert-plug', requireAuth, validateBody(insertPlugSchema), async (req, res) => {
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

router.post('/api/bungie/equip-loadout', requireAuth, validateBody(equipLoadoutSchema), async (req, res) => {
  try {
    const result = await equipLoadout(req.body, req.sessionAccessToken!);
    invalidateProfileCaches(req.body.membershipType);
    res.json(result);
  } catch (err: any) {
    handleBungieError(err, res, 'Equip loadout failed');
  }
});

router.post('/api/bungie/snapshot-loadout', requireAuth, validateBody(snapshotLoadoutSchema), async (req, res) => {
  try {
    const result = await snapshotLoadout(req.body, req.sessionAccessToken!);
    invalidateProfileCaches(req.body.membershipType);
    res.json(result);
  } catch (err: any) {
    handleBungieError(err, res, 'Snapshot loadout failed');
  }
});

router.post('/api/bungie/clear-loadout', requireAuth, validateBody(clearLoadoutSchema), async (req, res) => {
  try {
    const result = await clearLoadout(req.body, req.sessionAccessToken!);
    invalidateProfileCaches(req.body.membershipType);
    res.json(result);
  } catch (err: any) {
    handleBungieError(err, res, 'Clear loadout failed');
  }
});

router.get('/api/bungie/activity-history/:membershipType/:membershipId/:characterId', requireAuth, async (req, res) => {
  try {
    const { membershipType, membershipId, characterId } = req.params;
    if (typeof membershipType !== 'string' || typeof membershipId !== 'string' || typeof characterId !== 'string') {
      return res.status(400).json({ message: 'Invalid membership parameters' });
    }

    if (!req.sessionMembershipId || req.sessionMembershipId !== membershipId) {
      return res.status(403).json({ message: 'Access denied: membership mismatch' });
    }

    const mode = typeof req.query.mode === 'string' ? req.query.mode : 'raid';
    const rawCount = Number(req.query.count);
    const rawPage = Number(req.query.page);
    // Strict integer bounds prevent negative or non-finite pagination parameters.
    const count = Number.isSafeInteger(rawCount) && rawCount > 0
      ? Math.min(rawCount, 50) : 25;
    const page = Number.isSafeInteger(rawPage) && rawPage >= 0
      ? Math.min(rawPage, 100) : 0;

    const activities = await fetchActivityHistory(
      req.sessionAccessToken!,
      membershipType,
      membershipId,
      characterId,
      mode,
      count,
      page
    );
    res.json(activities);
  } catch (err: any) {
    handleBungieError(err, res, 'Failed to fetch activity history');
  }
});

export default router;
