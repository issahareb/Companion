import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { nanoid } from "nanoid";
import { api } from "@shared/routes";
import { storage } from "../storage";
import { requireAuth } from "./shared";

const router = Router();

router.get(api.loadouts.list.path, requireAuth, async (req, res) => {
  const bungieMembershipId = req.params.bungieMembershipId as string;
  if (req.sessionMembershipId !== bungieMembershipId) {
    return res.status(403).json({ message: 'Access denied' });
  }
  const loadouts = await storage.getLoadouts(bungieMembershipId);
  res.json(loadouts);
});

router.post(api.loadouts.create.path, requireAuth, async (req, res) => {
  try {
    const input = api.loadouts.create.input.parse(req.body);
    input.bungieMembershipId = req.sessionMembershipId!;
    const shareCode = input.shareCode || nanoid(10);
    const MAX_RETRIES = 3;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const code = attempt === 0 ? shareCode : nanoid(10);
      try {
        const loadout = await storage.createLoadout({ ...input, shareCode: code });
        return res.status(201).json(loadout);
      } catch (dbErr: any) {
        const isUniqueViolation = dbErr?.code === '23505' || dbErr?.message?.includes('unique');
        if (!isUniqueViolation || attempt === MAX_RETRIES - 1) throw dbErr;
      }
    }
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

router.delete('/api/loadouts/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id as string);
    if (isNaN(id)) {
      return res.status(400).json({ message: 'Invalid loadout ID' });
    }
    const deleted = await storage.deleteLoadout(id, req.sessionMembershipId!);
    if (!deleted) {
      return res.status(404).json({ message: 'Loadout not found' });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to delete loadout' });
  }
});

router.get(api.loadouts.getByShareCode.path, async (req, res) => {
  const shareCode = req.params.shareCode as string;
  const loadout = await storage.getLoadoutByShareCode(shareCode);
  if (!loadout) {
    return res.status(404).json({ message: "Loadout not found" });
  }
  res.json(loadout);
});

router.post('/api/loadouts/share-ingame', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name, items, classType } = req.body;
    if (!name || !items) {
      return res.status(400).json({ message: 'Missing name or items' });
    }
    const MAX_RETRIES = 3;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const shareCode = nanoid(10);
      try {
        const loadout = await storage.createLoadout({
          bungieMembershipId: req.sessionMembershipId!,
          name,
          items,
          classType: classType ?? null,
          shareCode,
          artifactMods: [],
        });
        return res.status(201).json({ shareCode, id: loadout.id });
      } catch (dbErr: any) {
        const isUniqueViolation = dbErr?.code === '23505' || dbErr?.message?.includes('unique');
        if (!isUniqueViolation || attempt === MAX_RETRIES - 1) {
          throw dbErr;
        }
      }
    }
  } catch (err: any) {
    res.status(500).json({ message: 'Failed to share loadout' });
  }
});

export default router;
