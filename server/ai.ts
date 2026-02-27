import OpenAI from "openai";
import { z } from "zod";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

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

function buildPrompt(data: CharacterAnalysisInput, language: string): string {
  const langInstruction = language === 'de'
    ? 'Antworte auf Deutsch.'
    : language === 'fr'
    ? 'Réponds en français.'
    : 'Respond in English.';

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

${langInstruction}

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
  const prompt = buildPrompt(data, language);

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "user", content: prompt },
    ],
    response_format: { type: "json_object" },
    max_completion_tokens: 8192,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from AI');
  }

  const raw = JSON.parse(content);
  const parsed = playstyleAnalysisSchema.parse(raw);
  parsed.rating = Math.max(1, Math.min(10, Math.round(parsed.rating)));

  return parsed;
}
