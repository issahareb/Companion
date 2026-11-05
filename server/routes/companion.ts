import { fetchManifest } from "../bungie";
import { Router } from "express";
import { z } from "zod";
import { requireAuth, handleBungieError } from "./shared";
import { membershipTypeSchema } from "../../shared/bungie-actions";
import {
  fetchWeeklyMilestones,
  fetchCharacterVendors,
  fetchActivityReport,
} from "../companion-data";

const router = Router();
const characterParams = z.object({
  membershipType: membershipTypeSchema,
  membershipId: z.string().regex(/^\d{1,20}$/),
  characterId: z.string().regex(/^\d{1,20}$/),
});
let weekly:
  | { at: number; data: Awaited<ReturnType<typeof fetchWeeklyMilestones>> }
  | undefined;
let pendingWeekly:
  | Promise<Awaited<ReturnType<typeof fetchWeeklyMilestones>>>
  | undefined;
router.get("/api/bungie/weekly", requireAuth, async (_req, res) => {
  try {
    if (!weekly || Date.now() - weekly.at > 300_000) {
      pendingWeekly ??= fetchWeeklyMilestones()
        .then((data) => {
          weekly = { at: Date.now(), data };
          return data;
        })
        .finally(() => {
          pendingWeekly = undefined;
        });
      await pendingWeekly;
    }
    res.json(weekly!.data);
  } catch (error) {
    handleBungieError(error, res, "Weekly activities unavailable");
  }
});
router.get(
  "/api/bungie/vendors/:membershipType/:membershipId/:characterId",
  requireAuth,
  async (req, res) => {
    const parsed = characterParams.safeParse(req.params);
    if (!parsed.success)
      return res.status(400).json({ message: "Invalid character parameters" });
    if (req.sessionMembershipId !== parsed.data.membershipId)
      return res.status(403).json({ message: "Membership mismatch" });
    const { membershipType, membershipId, characterId } = parsed.data;
    try {
      res.json(
        await fetchCharacterVendors(
          String(membershipType),
          membershipId,
          characterId,
          req.sessionAccessToken!,
        ),
      );
    } catch (error) {
      handleBungieError(error, res, "Vendor offers unavailable");
    }
  },
);
router.get(
  "/api/bungie/activity-report/:activityId",
  requireAuth,
  async (req, res) => {
    const id = z
      .string()
      .regex(/^\d{1,20}$/)
      .safeParse(req.params.activityId);
    if (!id.success)
      return res.status(400).json({ message: "Invalid activity ID" });
    try {
      res.json(await fetchActivityReport(id.data, req.sessionAccessToken!));
    } catch (error) {
      handleBungieError(error, res, "Activity report unavailable");
    }
  },
);
router.get("/api/bungie/loadout-names", requireAuth, async (_req, res) => {
  try {
    const manifest = await fetchManifest();
    res.json(
      Object.entries(manifest.loadoutNames).map(([hash, value]) => ({
        hash: Number(hash),
        name: value.name,
      })),
    );
  } catch (error) {
    handleBungieError(error, res, "Loadout names unavailable");
  }
});
export default router;
