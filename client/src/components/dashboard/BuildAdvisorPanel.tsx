import { useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Swords, Shield, Target, Crosshair, Skull, Castle, Loader2, AlertTriangle, RefreshCw, ChevronRight, Flame, Gem, TrendingUp, Lightbulb } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { CharacterData, InventoryItem, ArtifactInfo } from '@/hooks/use-profile-state';
import { apiRequest } from '@/lib/queryClient';

type ActivityType = 'raid' | 'nightfall' | 'pvp' | 'gambit' | 'dungeon';

interface BuildRecommendation {
  activity: string;
  recommendedWeapons: { slot: string; name: string; reason: string }[];
  recommendedArmor: { slot: string; name: string; reason: string }[];
  recommendedSubclass: { name: string; aspects: string[]; fragments: string[] };
  statPriorities: string[];
  strategy: string;
}

interface BuildAdvisorPanelProps {
  tabDirection: number;
  selectedCharacter: CharacterData | null;
  vaultItems: InventoryItem[];
  artifact?: ArtifactInfo;
}

const appleEase = [0.16, 1, 0.3, 1] as const;

const tabVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

const activities: { id: ActivityType; icon: typeof Swords; color: string }[] = [
  { id: 'raid', icon: Castle, color: '#E5C76B' },
  { id: 'nightfall', icon: Skull, color: '#818cf8' },
  { id: 'pvp', icon: Crosshair, color: '#ef4444' },
  { id: 'gambit', icon: Gem, color: '#22c55e' },
  { id: 'dungeon', icon: Flame, color: '#f59e0b' },
];

const activityLabels: Record<ActivityType, Record<string, string>> = {
  raid: { de: 'Raid', en: 'Raid', fr: 'Raid' },
  nightfall: { de: 'Dämmerung', en: 'Nightfall', fr: 'Crépuscule' },
  pvp: { de: 'PvP', en: 'PvP', fr: 'PvP' },
  gambit: { de: 'Gambit', en: 'Gambit', fr: 'Gambit' },
  dungeon: { de: 'Dungeon', en: 'Dungeon', fr: 'Donjon' },
};

export function BuildAdvisorPanel({ tabDirection, selectedCharacter, vaultItems, artifact }: BuildAdvisorPanelProps) {
  const { t, language } = useI18n();
  const [selectedActivity, setSelectedActivity] = useState<ActivityType>('raid');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cachedResults = useRef<Record<string, BuildRecommendation>>({});
  const [result, setResult] = useState<BuildRecommendation | null>(null);

  const generateRecommendation = useCallback(async () => {
    if (!selectedCharacter) return;

    const cacheKey = `${selectedActivity}-${selectedCharacter.characterId}-${language}`;
    if (cachedResults.current[cacheKey]) {
      setResult(cachedResults.current[cacheKey]);
      return;
    }

    setIsLoading(true);
    setError(null);

    const allItems = [...selectedCharacter.equippedItems, ...selectedCharacter.inventory, ...vaultItems];

    const availableWeapons = allItems
      .filter(i => ['kinetic', 'energy', 'power'].includes(i.slot))
      .map(w => ({
        name: w.name,
        type: w.type,
        slot: w.slot,
        rarity: w.rarity,
        power: w.power,
        perks: (w.perks || []).filter(p => p.isActive).map(p => p.name),
      }));

    const availableArmor = allItems
      .filter(i => ['helmet', 'arms', 'chest', 'legs', 'class'].includes(i.slot))
      .map(a => ({
        name: a.name,
        slot: a.slot,
        rarity: a.rarity,
      }));

    const subclassItem = selectedCharacter.equippedItems.find(i => i.slot === 'subclass');
    const subclass = subclassItem ? {
      name: subclassItem.name,
      sockets: (subclassItem.sockets || []).map(s => ({ name: s.name, category: s.description || 'ability' })),
    } : null;

    try {
      const res = await apiRequest('POST', '/api/ai/recommend-build', {
        buildData: {
          activity: selectedActivity,
          className: selectedCharacter.className,
          light: selectedCharacter.light,
          stats: selectedCharacter.stats.map(s => ({ name: s.name, value: s.value })),
          availableWeapons,
          availableArmor,
          subclass,
        },
        language,
      });
      const data = await res.json();
      cachedResults.current[cacheKey] = data;
      setResult(data);
    } catch (err: any) {
      if (err.message?.includes('429') || err.message?.includes('rate limit')) {
        setError(t('analysis.rateLimit'));
      } else {
        setError(t('analysis.error'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedCharacter, selectedActivity, vaultItems, language, t]);

  const slotIcons: Record<string, typeof Swords> = {
    kinetic: Target,
    energy: Flame,
    power: Skull,
  };

  return (
    <motion.div
      key="build-advisor"
      custom={tabDirection}
      variants={tabVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.45, ease: appleEase as unknown as number[] }}
      className="h-full overflow-y-auto scroll-container px-4 md:px-8 py-6"
      data-scroll-container
      data-testid="panel-build-advisor"
    >
      <div className="max-w-3xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: appleEase as unknown as number[] }}
          className="flex items-center gap-3 mb-2"
        >
          <Swords className="w-5 h-5 text-indigo-400" />
          <h2 className="font-display text-sm tracking-[0.2em] text-white uppercase" data-testid="text-build-advisor-title">
            {language === 'de' ? 'Build-Empfehlung' : language === 'fr' ? 'Recommandation de Build' : 'Build Recommendation'}
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: appleEase as unknown as number[], delay: 0.1 }}
          className="flex items-center gap-2 flex-wrap"
          data-testid="activity-selector"
        >
          {activities.map((act) => {
            const Icon = act.icon;
            const isSelected = selectedActivity === act.id;
            return (
              <button
                key={act.id}
                onClick={() => { setSelectedActivity(act.id); setResult(null); setError(null); }}
                className={`press-scale flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-display tracking-[0.15em] uppercase transition-all duration-300 border ${
                  isSelected
                    ? 'border-white/20 bg-white/[0.08] text-white'
                    : 'border-white/[0.06] bg-white/[0.02] text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'
                }`}
                style={isSelected ? { borderColor: `${act.color}40`, boxShadow: `0 0 12px ${act.color}15` } : {}}
                data-testid={`button-activity-${act.id}`}
              >
                <Icon className="w-4 h-4" style={isSelected ? { color: act.color } : {}} />
                <span>{activityLabels[act.id][language] || act.id}</span>
              </button>
            );
          })}
        </motion.div>

        {!result && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: appleEase as unknown as number[], delay: 0.15 }}
            className="flex flex-col items-center justify-center py-16 space-y-6"
          >
            <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center animate-breathe">
              <Swords className="w-10 h-10 text-indigo-400" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-gray-400 text-sm max-w-md" data-testid="text-build-description">
                {language === 'de'
                  ? `Wähle eine Aktivität und lass die KI das beste Loadout aus deinem Inventar zusammenstellen.`
                  : language === 'fr'
                  ? `Sélectionnez une activité et laissez l'IA composer le meilleur loadout à partir de votre inventaire.`
                  : `Select an activity and let AI build the best loadout from your inventory.`}
              </p>
              {selectedCharacter && (
                <p className="text-gray-600 text-xs">{selectedCharacter.className} · {selectedCharacter.light} Power</p>
              )}
            </div>
            <button
              onClick={generateRecommendation}
              disabled={!selectedCharacter}
              className="press-scale px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-display tracking-[0.2em] uppercase transition-all duration-300 destiny-clip-sm border border-indigo-500/30"
              data-testid="button-generate-build"
            >
              {language === 'de' ? 'Empfehlung generieren' : language === 'fr' ? 'Générer une recommandation' : 'Generate Recommendation'}
            </button>
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-400 text-xs flex items-center gap-2"
                data-testid="text-build-error"
              >
                <AlertTriangle className="w-3.5 h-3.5" /> {error}
              </motion.p>
            )}
          </motion.div>
        )}

        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 space-y-6"
          >
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              </div>
              <div className="absolute -inset-2 rounded-full border border-indigo-500/20 animate-ping" style={{ animationDuration: '2s' }} />
            </div>
            <p className="text-gray-400 text-xs font-display tracking-[0.2em] uppercase" data-testid="text-build-loading">
              {language === 'de' ? 'KI erstellt Loadout...' : language === 'fr' ? "L'IA compose le loadout..." : 'AI is building your loadout...'}
            </p>
          </motion.div>
        )}

        {result && !isLoading && (
          <div className="space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: appleEase as unknown as number[], delay: 0.1 }}
              className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 hover-lift"
            >
              <div className="flex items-center gap-2 mb-4">
                <Swords className="w-4 h-4 text-indigo-400" />
                <h3 className="font-display text-xs tracking-[0.15em] text-indigo-400 uppercase" data-testid="text-weapons-heading">
                  {language === 'de' ? 'Empfohlene Waffen' : language === 'fr' ? 'Armes recommandées' : 'Recommended Weapons'}
                </h3>
              </div>
              <ul className="space-y-3" data-testid="list-recommended-weapons">
                {result.recommendedWeapons.map((w, i) => {
                  const SlotIcon = slotIcons[w.slot] || Target;
                  return (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 + i * 0.08, duration: 0.4, ease: appleEase as unknown as number[] }}
                      className="flex items-start gap-3"
                      data-testid={`item-weapon-${i}`}
                    >
                      <SlotIcon className="w-4 h-4 text-indigo-400/60 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-sm text-white font-medium">{w.name}</span>
                        <span className="text-xs text-gray-600 ml-2 uppercase tracking-wider">{w.slot}</span>
                        <p className="text-xs text-gray-400 mt-0.5">{w.reason}</p>
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: appleEase as unknown as number[], delay: 0.2 }}
              className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 hover-lift"
            >
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-4 h-4 text-emerald-400" />
                <h3 className="font-display text-xs tracking-[0.15em] text-emerald-400 uppercase" data-testid="text-armor-heading">
                  {language === 'de' ? 'Empfohlene Rüstung' : language === 'fr' ? 'Armure recommandée' : 'Recommended Armor'}
                </h3>
              </div>
              <ul className="space-y-3" data-testid="list-recommended-armor">
                {result.recommendedArmor.map((a, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.08, duration: 0.4, ease: appleEase as unknown as number[] }}
                    className="flex items-start gap-3"
                    data-testid={`item-armor-${i}`}
                  >
                    <Shield className="w-4 h-4 text-emerald-400/60 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-sm text-white font-medium">{a.name}</span>
                      <span className="text-xs text-gray-600 ml-2 uppercase tracking-wider">{a.slot}</span>
                      <p className="text-xs text-gray-400 mt-0.5">{a.reason}</p>
                    </div>
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: appleEase as unknown as number[], delay: 0.3 }}
              className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 hover-lift"
            >
              <div className="flex items-center gap-2 mb-3">
                <Flame className="w-4 h-4 text-purple-400" />
                <h3 className="font-display text-xs tracking-[0.15em] text-purple-400 uppercase" data-testid="text-subclass-heading">
                  {language === 'de' ? 'Subklasse' : language === 'fr' ? 'Sous-classe' : 'Subclass'}
                </h3>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-white font-medium" data-testid="text-subclass-name">{result.recommendedSubclass.name}</p>
                {result.recommendedSubclass.aspects.length > 0 && (
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wider">
                      {language === 'de' ? 'Aspekte' : language === 'fr' ? 'Aspects' : 'Aspects'}
                    </span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {result.recommendedSubclass.aspects.map((asp, i) => (
                        <span key={i} className="px-2 py-0.5 bg-purple-500/15 border border-purple-500/20 rounded-full text-purple-300 text-xs" data-testid={`badge-aspect-${i}`}>
                          {asp}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {result.recommendedSubclass.fragments.length > 0 && (
                  <div>
                    <span className="text-xs text-gray-500 uppercase tracking-wider">
                      {language === 'de' ? 'Fragmente' : language === 'fr' ? 'Fragments' : 'Fragments'}
                    </span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {result.recommendedSubclass.fragments.map((frag, i) => (
                        <span key={i} className="px-2 py-0.5 bg-purple-500/10 border border-purple-500/15 rounded-full text-purple-300/80 text-xs" data-testid={`badge-fragment-${i}`}>
                          {frag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: appleEase as unknown as number[], delay: 0.4 }}
                className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 hover-lift"
              >
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-[#E5C76B]" />
                  <h3 className="font-display text-xs tracking-[0.15em] text-[#E5C76B] uppercase" data-testid="text-stats-heading">
                    {language === 'de' ? 'Stat-Prioritäten' : language === 'fr' ? 'Priorités de stats' : 'Stat Priorities'}
                  </h3>
                </div>
                <ol className="space-y-2" data-testid="list-stat-priorities">
                  {result.statPriorities.map((stat, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.5 + i * 0.08, duration: 0.4, ease: appleEase as unknown as number[] }}
                      className="flex items-center gap-2 text-sm text-gray-300"
                      data-testid={`item-stat-${i}`}
                    >
                      <span className="w-5 h-5 rounded-full bg-[#E5C76B]/10 flex items-center justify-center text-[#E5C76B] text-xs font-bold shrink-0">
                        {i + 1}
                      </span>
                      {stat}
                    </motion.li>
                  ))}
                </ol>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: appleEase as unknown as number[], delay: 0.5 }}
                className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 hover-lift"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  <h3 className="font-display text-xs tracking-[0.15em] text-amber-400 uppercase" data-testid="text-strategy-heading">
                    {language === 'de' ? 'Strategie' : language === 'fr' ? 'Stratégie' : 'Strategy'}
                  </h3>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed" data-testid="text-strategy-content">
                  {result.strategy}
                </p>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="flex items-center justify-center pt-2 pb-8"
            >
              <button
                onClick={() => {
                  const cacheKey = `${selectedActivity}-${selectedCharacter?.characterId}-${language}`;
                  delete cachedResults.current[cacheKey];
                  setResult(null);
                  setError(null);
                }}
                className="press-scale flex items-center gap-2 px-5 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white text-xs font-display tracking-[0.15em] uppercase transition-all duration-300 border border-white/[0.06] rounded-lg"
                data-testid="button-regenerate-build"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {language === 'de' ? 'Neu generieren' : language === 'fr' ? 'Régénérer' : 'Regenerate'}
              </button>
            </motion.div>
          </div>
        )}
      </div>
    </motion.div>
  );
}