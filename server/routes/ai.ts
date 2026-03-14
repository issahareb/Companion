import { Router, type Request, type Response } from "express";
import { requireAuth, handleAiError } from "./shared";
import { checkAiUsageLimit, recordAiUsage } from "./premium";

const router = Router();

async function enforceAiLimit(req: Request, res: Response): Promise<boolean> {
  const membershipId = req.sessionMembershipId;
  if (!membershipId) {
    res.status(401).json({ message: 'Not authenticated' });
    return false;
  }

  const usage = await checkAiUsageLimit(membershipId);
  if (!usage.allowed) {
    res.status(429).json({
      message: 'Daily AI limit reached. Upgrade to Premium for unlimited AI analyses.',
      errorType: 'ai_limit',
      aiUsage: usage,
    });
    return false;
  }
  return true;
}

router.post('/api/ai/analyze-playstyle', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!await enforceAiLimit(req, res)) return;
    const { analyzePlaystyle, characterAnalysisInputSchema } = await import('../ai');
    const { characterData, language } = req.body;

    const parseResult = characterAnalysisInputSchema.safeParse(characterData);
    if (!parseResult.success) {
      return res.status(400).json({ message: 'Invalid character data', errors: parseResult.error.flatten().fieldErrors });
    }

    const lang = ['de', 'en', 'fr'].includes(language) ? language : 'de';
    const result = await analyzePlaystyle(parseResult.data, lang);
    await recordAiUsage(req.sessionMembershipId!);
    res.json(result);
  } catch (err: any) {
    handleAiError(err, res, 'Playstyle analysis');
  }
});

router.post('/api/ai/recommend-build', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!await enforceAiLimit(req, res)) return;
    const { generateBuildRecommendation, buildRecommendationInputSchema } = await import('../ai');
    const { buildData, language } = req.body;

    const parseResult = buildRecommendationInputSchema.safeParse(buildData);
    if (!parseResult.success) {
      return res.status(400).json({ message: 'Invalid build data', errors: parseResult.error.flatten().fieldErrors });
    }

    const lang = ['de', 'en', 'fr'].includes(language) ? language : 'de';
    const result = await generateBuildRecommendation(parseResult.data, lang);
    await recordAiUsage(req.sessionMembershipId!);
    res.json(result);
  } catch (err: any) {
    handleAiError(err, res, 'Build recommendation');
  }
});

router.post('/api/ai/evaluate-roll', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!await enforceAiLimit(req, res)) return;
    const { evaluateWeaponRoll, weaponRollInputSchema } = await import('../ai');
    const { weaponData, language } = req.body;

    const parseResult = weaponRollInputSchema.safeParse(weaponData);
    if (!parseResult.success) {
      return res.status(400).json({ message: 'Invalid weapon data', errors: parseResult.error.flatten().fieldErrors });
    }

    const lang = ['de', 'en', 'fr'].includes(language) ? language : 'de';
    const result = await evaluateWeaponRoll(parseResult.data, lang);
    await recordAiUsage(req.sessionMembershipId!);
    res.json(result);
  } catch (err: any) {
    handleAiError(err, res, 'Weapon roll evaluation');
  }
});

router.post('/api/ai/triumph-advisor', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!await enforceAiLimit(req, res)) return;
    const { suggestTriumphPath, triumphAdvisorInputSchema } = await import('../ai');
    const { triumphData, language } = req.body;

    const parseResult = triumphAdvisorInputSchema.safeParse(triumphData);
    if (!parseResult.success) {
      return res.status(400).json({ message: 'Invalid triumph data', errors: parseResult.error.flatten().fieldErrors });
    }

    const lang = ['de', 'en', 'fr'].includes(language) ? language : 'de';
    const result = await suggestTriumphPath(parseResult.data, lang);
    await recordAiUsage(req.sessionMembershipId!);
    res.json(result);
  } catch (err: any) {
    handleAiError(err, res, 'Triumph advisor');
  }
});

router.post('/api/ai/synergies', requireAuth, async (req: Request, res: Response) => {
  try {
    if (!await enforceAiLimit(req, res)) return;
    const { analyzeSynergies, synergyInputSchema } = await import('../ai');
    const { equipmentData, language } = req.body;

    const parseResult = synergyInputSchema.safeParse(equipmentData);
    if (!parseResult.success) {
      return res.status(400).json({ message: 'Invalid equipment data', errors: parseResult.error.flatten().fieldErrors });
    }

    const lang = ['de', 'en', 'fr'].includes(language) ? language : 'de';
    const result = await analyzeSynergies(parseResult.data, lang);
    await recordAiUsage(req.sessionMembershipId!);
    res.json(result);
  } catch (err: any) {
    handleAiError(err, res, 'Synergy analysis');
  }
});

export default router;
