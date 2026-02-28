import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

function getLangInstruction(language: string): string {
  return language === 'de'
    ? 'Antworte auf Deutsch.'
    : language === 'fr'
    ? 'Réponds en français.'
    : 'Respond in English.';
}

async function callAI<T>(prompt: string, schema: z.ZodSchema<T>): Promise<T> {
  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    response_format: { type: "json_object" },
    max_completion_tokens: 8192,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from AI');
  }

  const raw = JSON.parse(content);
  return schema.parse(raw);
}

export const characterAnalysisInputSchema = z.object({
  className: z.string().min(1),
  raceName: z.string().default('Unknown'),
  light: z.number().default(0),
  stats: z.array(z.object({ name: z.string(), value: z.number() })).default([]),
  equippedItems: z.array(z.object({
    slot: z.string(),
    name: z.string(),
    type: z.string().default(''),
    rarity: z.string().default(''),
    power: z.number().default(0),
    perks: z.array(z.object({ name: z.string(), isActive: z.boolean() })).default([]),
    mods: z.array(z.object({ name: z.string() })).default([]),
  })).default([]),
  subclass: z.object({
    name: z.string(),
    sockets: z.array(z.object({ name: z.string(), category: z.string() })).default([]),
  }).nullable().default(null),
  artifact: z.object({
    powerBonus: z.number(),
    activeMods: z.array(z.string()).default([]),
  }).nullable().default(null),
});

export type CharacterAnalysisInput = z.infer<typeof characterAnalysisInputSchema>;

const playstyleAnalysisSchema = z.object({
  playstyle: z.string(),
  summary: z.string(),
  rating: z.number(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  synergies: z.array(z.string()),
  tips: z.array(z.string()),
});

export type PlaystyleAnalysis = z.infer<typeof playstyleAnalysisSchema>;

function buildPlaystylePrompt(data: CharacterAnalysisInput, language: string): string {
  const statsStr = data.stats.map(s => `${s.name}: ${s.value}`).join(', ');

  const weaponsStr = data.equippedItems
    .filter(i => ['kinetic', 'energy', 'power'].includes(i.slot))
    .map(w => {
      const activePerks = w.perks.filter(p => p.isActive).map(p => p.name).join(', ');
      const mods = w.mods.map(m => m.name).join(', ');
      return `${w.slot}: ${w.name} (${w.type}, ${w.rarity}) [Perks: ${activePerks || 'none'}] [Mods: ${mods || 'none'}]`;
    }).join('\n');

  const armorStr = data.equippedItems
    .filter(i => ['helmet', 'arms', 'chest', 'legs', 'class'].includes(i.slot))
    .map(a => {
      const mods = a.mods.map(m => m.name).join(', ');
      return `${a.slot}: ${a.name} (${a.rarity}) [Mods: ${mods || 'none'}]`;
    }).join('\n');

  const subclassStr = data.subclass
    ? `Subclass: ${data.subclass.name}\nAbilities: ${data.subclass.sockets.map(s => `${s.category}: ${s.name}`).join(', ')}`
    : 'Subclass: Unknown';

  const artifactStr = data.artifact
    ? `Artifact Power Bonus: +${data.artifact.powerBonus}\nActive Artifact Mods: ${data.artifact.activeMods.join(', ') || 'none'}`
    : '';

  return `You are an expert Destiny 2 build analyst and PvE/PvP strategist. Analyze this Guardian's build and provide a detailed playstyle analysis.

${getLangInstruction(language)}

CHARACTER:
Class: ${data.className} (${data.raceName})
Power Level: ${data.light}

STATS:
${statsStr}

WEAPONS:
${weaponsStr}

ARMOR:
${armorStr}

${subclassStr}

${artifactStr}

Analyze this build and return a JSON object with exactly these fields:
{
  "playstyle": "A short, punchy 2-4 word playstyle label (e.g. 'Aggressiver Nahkämpfer', 'Precision Marksman', 'Support Healer')",
  "summary": "A 2-3 sentence summary of how this build plays and what it excels at",
  "rating": <number 1-10 rating of the overall build cohesion and effectiveness>,
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "weaknesses": ["weakness 1", "weakness 2"],
  "synergies": ["Describe a specific synergy between 2+ parts of the build", "Another synergy"],
  "tips": ["Specific actionable improvement tip 1", "Tip 2", "Tip 3"]
}

Return ONLY valid JSON. No markdown, no code fences, no extra text.`;
}

export async function analyzePlaystyle(
  data: CharacterAnalysisInput,
  language: string = 'de'
): Promise<PlaystyleAnalysis> {
  const prompt = buildPlaystylePrompt(data, language);
  const parsed = await callAI(prompt, playstyleAnalysisSchema);
  parsed.rating = Math.max(1, Math.min(10, Math.round(parsed.rating)));
  return parsed;
}

export const buildRecommendationInputSchema = z.object({
  activity: z.enum(['raid', 'nightfall', 'pvp', 'gambit', 'dungeon']),
  className: z.string().min(1),
  light: z.number().default(0),
  stats: z.array(z.object({ name: z.string(), value: z.number() })).default([]),
  availableWeapons: z.array(z.object({
    name: z.string(),
    type: z.string(),
    slot: z.string(),
    rarity: z.string().default(''),
    power: z.number().default(0),
    perks: z.array(z.string()).default([]),
  })).default([]),
  availableArmor: z.array(z.object({
    name: z.string(),
    slot: z.string(),
    rarity: z.string().default(''),
  })).default([]),
  subclass: z.object({
    name: z.string(),
    sockets: z.array(z.object({ name: z.string(), category: z.string() })).default([]),
  }).nullable().default(null),
});

export type BuildRecommendationInput = z.infer<typeof buildRecommendationInputSchema>;

const buildRecommendationSchema = z.object({
  activity: z.string(),
  recommendedWeapons: z.array(z.object({
    slot: z.string(),
    name: z.string(),
    reason: z.string(),
  })),
  recommendedArmor: z.array(z.object({
    slot: z.string(),
    name: z.string(),
    reason: z.string(),
  })),
  recommendedSubclass: z.object({
    name: z.string(),
    aspects: z.array(z.string()),
    fragments: z.array(z.string()),
  }),
  statPriorities: z.array(z.string()),
  strategy: z.string(),
});

export type BuildRecommendation = z.infer<typeof buildRecommendationSchema>;

export async function generateBuildRecommendation(
  data: BuildRecommendationInput,
  language: string = 'de'
): Promise<BuildRecommendation> {
  const weaponsList = data.availableWeapons
    .slice(0, 60)
    .map(w => `${w.slot}: ${w.name} (${w.type}, ${w.rarity}, ${w.power}) [Perks: ${w.perks.join(', ') || 'none'}]`)
    .join('\n');

  const armorList = data.availableArmor
    .slice(0, 30)
    .map(a => `${a.slot}: ${a.name} (${a.rarity})`)
    .join('\n');

  const subclassStr = data.subclass
    ? `Current Subclass: ${data.subclass.name}\nAbilities: ${data.subclass.sockets.map(s => `${s.category}: ${s.name}`).join(', ')}`
    : 'Subclass: Not set';

  const statsStr = data.stats.map(s => `${s.name}: ${s.value}`).join(', ');

  const activityDescriptions: Record<string, string> = {
    raid: 'Raid (6-player endgame PvE, boss DPS, ad clear, survivability)',
    nightfall: 'Grandmaster Nightfall (high-level PvE, match game, champions)',
    pvp: 'Crucible PvP (Trials of Osiris / Competitive)',
    gambit: 'Gambit (hybrid PvE/PvP, invading, boss melt)',
    dungeon: 'Dungeon (3-player endgame PvE, solo-friendly)',
  };

  const prompt = `You are an expert Destiny 2 build crafter. Recommend the BEST loadout for ${activityDescriptions[data.activity] || data.activity} using ONLY the weapons and armor the player actually owns. Pick from the available items below.

${getLangInstruction(language)}

CLASS: ${data.className}
POWER: ${data.light}
STATS: ${statsStr}

${subclassStr}

AVAILABLE WEAPONS:
${weaponsList || 'No weapons available'}

AVAILABLE ARMOR:
${armorList || 'No armor available'}

Return a JSON object with exactly these fields:
{
  "activity": "${data.activity}",
  "recommendedWeapons": [{"slot": "kinetic|energy|power", "name": "exact weapon name from list", "reason": "why this weapon is great for this activity"}],
  "recommendedArmor": [{"slot": "helmet|arms|chest|legs|class", "name": "exact armor name from list", "reason": "why this armor piece"}],
  "recommendedSubclass": {"name": "subclass name", "aspects": ["aspect1", "aspect2"], "fragments": ["fragment1", "fragment2", "fragment3"]},
  "statPriorities": ["Most important stat for this activity", "Second", "Third"],
  "strategy": "2-3 sentence strategy for how to play this build in the activity"
}

IMPORTANT: Only recommend items that appear in the AVAILABLE lists above. Return ONLY valid JSON.`;

  return callAI(prompt, buildRecommendationSchema);
}

export const weaponRollInputSchema = z.object({
  name: z.string().min(1),
  type: z.string().default(''),
  slot: z.string().default(''),
  rarity: z.string().default(''),
  power: z.number().default(0),
  perks: z.array(z.object({
    name: z.string(),
    isActive: z.boolean().default(false),
    column: z.number().default(0),
  })).default([]),
  mods: z.array(z.object({ name: z.string() })).default([]),
  masterwork: z.string().default(''),
});

export type WeaponRollInput = z.infer<typeof weaponRollInputSchema>;

const weaponRollSchema = z.object({
  verdict: z.enum(['god_roll', 'great', 'good', 'average', 'shard']),
  score: z.number(),
  perkBreakdown: z.array(z.object({
    name: z.string(),
    rating: z.enum(['s', 'a', 'b', 'c', 'f']),
    explanation: z.string(),
  })),
  idealPerks: z.array(z.string()),
  summary: z.string(),
});

export type WeaponRollEvaluation = z.infer<typeof weaponRollSchema>;

export async function evaluateWeaponRoll(
  data: WeaponRollInput,
  language: string = 'de'
): Promise<WeaponRollEvaluation> {
  const perksStr = data.perks
    .map(p => `${p.name}${p.isActive ? ' (active)' : ''} [column ${p.column}]`)
    .join('\n');

  const modsStr = data.mods.map(m => m.name).join(', ') || 'none';

  const prompt = `You are an expert Destiny 2 weapon analyst. Evaluate this weapon roll in detail.

${getLangInstruction(language)}

WEAPON: ${data.name}
Type: ${data.type}
Slot: ${data.slot}
Rarity: ${data.rarity}
Power: ${data.power}
Masterwork: ${data.masterwork || 'none'}

PERKS:
${perksStr || 'No perks'}

MODS: ${modsStr}

Analyze each perk individually and the overall roll quality. Consider PvE and PvP viability.

Return a JSON object with exactly these fields:
{
  "verdict": "god_roll" | "great" | "good" | "average" | "shard",
  "score": <number 1-10>,
  "perkBreakdown": [{"name": "perk name", "rating": "s|a|b|c|f", "explanation": "why this perk is good/bad for this weapon"}],
  "idealPerks": ["ideal perk 1 for this weapon", "ideal perk 2"],
  "summary": "2-3 sentence summary of this roll's quality and best use case"
}

Return ONLY valid JSON. No markdown, no code fences, no extra text.`;

  const parsed = await callAI(prompt, weaponRollSchema);
  parsed.score = Math.max(1, Math.min(10, Math.round(parsed.score)));
  return parsed;
}

export const triumphAdvisorInputSchema = z.object({
  incompleteRecords: z.array(z.object({
    name: z.string(),
    description: z.string().default(''),
    objectives: z.array(z.object({
      description: z.string(),
      progress: z.number().default(0),
      completionValue: z.number().default(1),
      complete: z.boolean().default(false),
    })).default([]),
  })).default([]),
  className: z.string().default(''),
  equippedItems: z.array(z.object({
    name: z.string(),
    type: z.string().default(''),
    slot: z.string().default(''),
  })).default([]),
});

export type TriumphAdvisorInput = z.infer<typeof triumphAdvisorInputSchema>;

const triumphAdvisorSchema = z.object({
  prioritizedTriumphs: z.array(z.object({
    name: z.string(),
    reason: z.string(),
    estimatedTime: z.string(),
    tips: z.array(z.string()),
  })),
  generalAdvice: z.string(),
});

export type TriumphAdvisorResult = z.infer<typeof triumphAdvisorSchema>;

export async function suggestTriumphPath(
  data: TriumphAdvisorInput,
  language: string = 'de'
): Promise<TriumphAdvisorResult> {
  const recordsStr = data.incompleteRecords
    .slice(0, 30)
    .map(r => {
      const objStr = r.objectives
        .map(o => `  - ${o.description}: ${o.progress}/${o.completionValue}${o.complete ? ' (DONE)' : ''}`)
        .join('\n');
      return `${r.name}: ${r.description}\n${objStr}`;
    }).join('\n\n');

  const equippedStr = data.equippedItems
    .map(i => `${i.slot}: ${i.name} (${i.type})`)
    .join('\n');

  const prompt = `You are a Destiny 2 triumph hunting expert. Analyze the player's incomplete triumphs and recommend the most efficient path to complete them.

${getLangInstruction(language)}

CLASS: ${data.className}

CURRENTLY EQUIPPED:
${equippedStr || 'Unknown'}

INCOMPLETE TRIUMPHS (with progress):
${recordsStr || 'No triumphs available'}

Prioritize triumphs that are closest to completion and can be done with the player's current setup. Consider which triumphs can be worked on simultaneously.

Return a JSON object with exactly these fields:
{
  "prioritizedTriumphs": [
    {"name": "triumph name", "reason": "why prioritize this one", "estimatedTime": "~30 min", "tips": ["specific tip 1", "tip 2"]}
  ],
  "generalAdvice": "2-3 sentences of general triumph hunting strategy for this player"
}

Return 5-8 prioritized triumphs. Return ONLY valid JSON. No markdown, no code fences, no extra text.`;

  return callAI(prompt, triumphAdvisorSchema);
}

export const synergyInputSchema = z.object({
  className: z.string().min(1),
  stats: z.array(z.object({ name: z.string(), value: z.number() })).default([]),
  equippedItems: z.array(z.object({
    slot: z.string(),
    name: z.string(),
    type: z.string().default(''),
    rarity: z.string().default(''),
    perks: z.array(z.object({ name: z.string(), isActive: z.boolean() })).default([]),
    mods: z.array(z.object({ name: z.string() })).default([]),
  })).default([]),
  subclass: z.object({
    name: z.string(),
    element: z.string().default(''),
    sockets: z.array(z.object({ name: z.string(), category: z.string() })).default([]),
  }).nullable().default(null),
  armorMods: z.array(z.object({
    slot: z.string(),
    mods: z.array(z.object({ name: z.string() })).default([]),
  })).default([]),
});

export type SynergyInput = z.infer<typeof synergyInputSchema>;

const synergyAnalysisSchema = z.object({
  overallRating: z.number(),
  synergies: z.array(z.object({
    name: z.string(),
    strength: z.enum(['strong', 'moderate', 'weak']),
    items: z.array(z.string()),
    perks: z.array(z.string()),
    explanation: z.string(),
  })),
  antiSynergies: z.array(z.object({
    issue: z.string(),
    items: z.array(z.string()),
    explanation: z.string(),
    fix: z.string(),
  })),
  suggestions: z.array(z.object({
    current: z.string(),
    recommended: z.string(),
    reason: z.string(),
  })),
  summary: z.string(),
});

export type SynergyAnalysis = z.infer<typeof synergyAnalysisSchema>;

export async function analyzeSynergies(
  data: SynergyInput,
  language: string = 'de'
): Promise<SynergyAnalysis> {
  const weaponsStr = data.equippedItems
    .filter(i => ['kinetic', 'energy', 'power'].includes(i.slot))
    .map(w => {
      const activePerks = w.perks.filter(p => p.isActive).map(p => p.name).join(', ');
      const mods = w.mods.map(m => m.name).join(', ');
      return `${w.slot}: ${w.name} (${w.type}, ${w.rarity}) [Perks: ${activePerks || 'none'}] [Mods: ${mods || 'none'}]`;
    }).join('\n');

  const armorStr = data.equippedItems
    .filter(i => ['helmet', 'arms', 'chest', 'legs', 'class'].includes(i.slot))
    .map(a => {
      const perks = a.perks.filter(p => p.isActive).map(p => p.name).join(', ');
      const mods = a.mods.map(m => m.name).join(', ');
      return `${a.slot}: ${a.name} (${a.rarity}) [Perks: ${perks || 'none'}] [Mods: ${mods || 'none'}]`;
    }).join('\n');

  const statsStr = data.stats.map(s => `${s.name}: ${s.value}`).join(', ');

  const subclassStr = data.subclass
    ? `Subclass: ${data.subclass.name} (${data.subclass.element})\nAbilities/Fragments: ${data.subclass.sockets.map(s => `${s.category}: ${s.name}`).join(', ')}`
    : 'Subclass: Unknown';

  const prompt = `You are an expert Destiny 2 build theorycrafting specialist focused on PERK AND MOD SYNERGIES. Your job is to find every meaningful interaction between the equipped gear's perks, mods, subclass abilities, and armor stats.

${getLangInstruction(language)}

CLASS: ${data.className}

STATS:
${statsStr}

WEAPONS:
${weaponsStr}

ARMOR (with perks and mods):
${armorStr}

${subclassStr}

IMPORTANT: Look for CROSS-ITEM synergies specifically:
- Armor perks that boost weapon effectiveness (e.g., "Ashes to Assets" on helmet + grenade builds = super energy)
- Weapon perks that synergize with subclass abilities (e.g., "Incandescent" + Solar subclass fragments)
- Mod combinations across armor pieces that create loops (e.g., "Font of Might" + matching element weapons)
- Stat thresholds that enable build mechanics (e.g., 100 Discipline + grenade-focused mods)
- Weapon perk combos that chain together (e.g., "Demolitionist" + "Adrenaline Junkie")
- Armor charge mechanics (collecting/spending orbs, elemental wells)
- Anti-synergies where perks conflict or are wasted

Return a JSON object with exactly these fields:
{
  "overallRating": <number 1-10 rating of how well the equipment synergizes>,
  "synergies": [
    {
      "name": "Short synergy combo name (2-5 words)",
      "strength": "strong" | "moderate" | "weak",
      "items": ["Item/slot name 1", "Item/slot name 2"],
      "perks": ["Perk/mod name 1", "Perk/mod name 2"],
      "explanation": "Detailed explanation of HOW these interact and WHY it's effective"
    }
  ],
  "antiSynergies": [
    {
      "issue": "Short description of the conflict",
      "items": ["Item 1", "Item 2"],
      "explanation": "Why these don't work well together",
      "fix": "What to swap to fix this"
    }
  ],
  "suggestions": [
    {
      "current": "Current perk/mod name",
      "recommended": "Recommended replacement",
      "reason": "Why this swap improves synergy"
    }
  ],
  "summary": "2-3 sentence overview of the build's synergy quality and identity"
}

Find 4-8 synergies, 0-3 anti-synergies, and 2-4 suggestions. Be specific about Destiny 2 game mechanics. Return ONLY valid JSON.`;

  const result = await callAI(prompt, synergyAnalysisSchema);
  result.overallRating = Math.max(1, Math.min(10, Math.round(result.overallRating)));
  return result;
}
