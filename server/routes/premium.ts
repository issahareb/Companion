import { Router, type Request, type Response } from "express";
import { requireAuth } from "./shared";
import { storage } from "../storage";

const FREE_DAILY_AI_LIMIT = 5;

const router = Router();

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

router.get('/api/premium/status', requireAuth, async (req: Request, res: Response) => {
  try {
    const membershipId = req.sessionMembershipId!;
    const premium = await storage.getPremiumStatus(membershipId);
    const today = getTodayDate();
    const usage = await storage.getAiUsage(membershipId, today);

    const isPremium = premium?.isPremium === 1 &&
      (!premium.premiumUntil || premium.premiumUntil > new Date());

    res.json({
      isPremium,
      premiumSince: premium?.premiumSince || null,
      premiumUntil: premium?.premiumUntil || null,
      aiUsage: {
        used: usage?.requestCount ?? 0,
        limit: isPremium ? null : FREE_DAILY_AI_LIMIT,
        remaining: isPremium ? null : Math.max(0, FREE_DAILY_AI_LIMIT - (usage?.requestCount ?? 0)),
      },
    });
  } catch (err: any) {
    console.error('[premium] Failed to get status:', err.message);
    res.status(500).json({ message: 'Failed to get premium status' });
  }
});

export async function checkAiUsageLimit(membershipId: string): Promise<{ allowed: boolean; used: number; limit: number | null; remaining: number | null }> {
  const premium = await storage.getPremiumStatus(membershipId);
  const isPremium = premium?.isPremium === 1 &&
    (!premium.premiumUntil || premium.premiumUntil > new Date());

  if (isPremium) {
    return { allowed: true, used: 0, limit: null, remaining: null };
  }

  const today = getTodayDate();
  const usage = await storage.getAiUsage(membershipId, today);
  const used = usage?.requestCount ?? 0;

  return {
    allowed: used < FREE_DAILY_AI_LIMIT,
    used,
    limit: FREE_DAILY_AI_LIMIT,
    remaining: Math.max(0, FREE_DAILY_AI_LIMIT - used),
  };
}

export async function recordAiUsage(membershipId: string): Promise<void> {
  const today = getTodayDate();
  await storage.incrementAiUsage(membershipId, today);
}

export default router;
