import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, Zap, AlertTriangle, ArrowRightLeft, RefreshCw, Loader2, Shield, ChevronRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { CharacterData } from '@/hooks/use-profile-state';
import { apiRequest } from '@/lib/queryClient';

interface SynergyCombo {
  name: string;
  strength: 'strong' | 'moderate' | 'weak';
  items: string[];
  perks: string[];
  explanation: string;
}

interface AntiSynergy {
  issue: string;
  items: string[];
  explanation: string;
  fix: string;
}

interface SwapSuggestion {
  current: string;
  recommended: string;
  reason: string;
}

interface SynergyAnalysis {
  overallRating: number;
  synergies: SynergyCombo[];
  antiSynergies: AntiSynergy[];
  suggestions: SwapSuggestion[];
  summary: string;
}

interface SynergyPanelProps {
  tabDirection: number;
  selectedCharacter: CharacterData | null;
}

const appleEase = [0.16, 1, 0.3, 1] as const;

const tabVariants = {
  enter: (dir: number) => ({ x: dir > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({ x: dir > 0 ? -60 : 60, opacity: 0 }),
};

function RatingRing({ rating, size = 96 }: { rating: number; size?: number }) {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (rating / 10) * circumference;
  const color = rating >= 8 ? '#E5C76B' : rating >= 6 ? '#818cf8' : rating >= 4 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative" style={{ width: size, height: size }} data-testid="synergy-rating-ring">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="white" strokeOpacity={0.06} strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round"
          initial={{ strokeDasharray: circumference, strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.5, ease: appleEase as unknown as number[], delay: 0.3 }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-2xl font-bold text-white"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, type: 'spring', damping: 20, stiffness: 200 }}
        >
          {rating}
        </motion.span>
        <span className="text-[9px] text-gray-500 uppercase tracking-[0.2em]">/10</span>
      </div>
    </div>
  );
}

function StrengthBadge({ strength, t }: { strength: 'strong' | 'moderate' | 'weak'; t: (key: string) => string }) {
  const config = {
    strong: { bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-400' },
    moderate: { bg: 'bg-amber-500/10 border-amber-500/30', text: 'text-amber-400' },
    weak: { bg: 'bg-gray-500/10 border-gray-500/30', text: 'text-gray-400' },
  };
  const c = config[strength];
  return (
    <span className={`px-2 py-0.5 text-[9px] font-display uppercase tracking-[0.15em] border rounded-full ${c.bg} ${c.text}`} data-testid={`badge-strength-${strength}`}>
      {t(`synergy.strength.${strength}`)}
    </span>
  );
}

export default function SynergyPanel({ tabDirection, selectedCharacter }: SynergyPanelProps) {
  const { t, language } = useI18n();
  const [result, setResult] = useState<SynergyAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async () => {
    if (!selectedCharacter) return;
    setLoading(true);
    setError(null);

    try {
      const equippedItems = (selectedCharacter.inventory || [])
        .filter((item: any) => item.isEquipped)
        .map((item: any) => ({
          slot: item.slot || '',
          name: item.name || 'Unknown',
          type: item.type || '',
          rarity: item.rarity || '',
          perks: (item.perks || []).map((p: any) => ({ name: p.name, isActive: p.isActive ?? true })),
          mods: (item.mods || []).map((m: any) => ({ name: m.name })),
        }));

      const subclass = selectedCharacter.subclass
        ? {
            name: selectedCharacter.subclass.name || 'Unknown',
            element: selectedCharacter.subclass.element || '',
            sockets: (selectedCharacter.subclass.sockets || []).map((s: any) => ({
              name: s.name || '',
              category: s.category || '',
            })),
          }
        : null;

      const stats = (selectedCharacter.stats || []).map((s: any) => ({
        name: s.name || '',
        value: s.value || 0,
      }));

      const equipmentData = {
        className: selectedCharacter.className || 'Unknown',
        stats,
        equippedItems,
        subclass,
        armorMods: [],
      };

      const res = await apiRequest('POST', '/api/ai/synergies', {
        equipmentData,
        language,
      });

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      if (err.message?.includes('429') || err.message?.includes('rate limit')) {
        setError(t('analysis.rateLimit'));
      } else {
        setError(t('analysis.error'));
      }
    } finally {
      setLoading(false);
    }
  }, [selectedCharacter, language, t]);

  if (!selectedCharacter) {
    return (
      <motion.div
        custom={tabDirection}
        variants={tabVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ duration: 0.4, ease: appleEase as unknown as number[] }}
        className="p-6 text-gray-500 text-center"
      >
        {t('analysis.error')}
      </motion.div>
    );
  }

  return (
    <motion.div
      custom={tabDirection}
      variants={tabVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.4, ease: appleEase as unknown as number[] }}
      className="h-full overflow-y-auto overflow-x-hidden px-4 md:px-8 pb-8"
      data-testid="synergy-panel"
    >
      {!result && !loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: appleEase as unknown as number[] }}
          className="max-w-lg mx-auto text-center mt-12"
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/[0.06] flex items-center justify-center">
            <Link2 className="w-7 h-7 text-indigo-400" />
          </div>
          <h3 className="font-display text-lg text-white tracking-wide mb-2" data-testid="text-synergy-title">
            {t('synergy.title')}
          </h3>
          <p className="text-sm text-gray-400 leading-relaxed mb-8">
            {t('synergy.description')}
          </p>
          <button
            onClick={analyze}
            className="px-6 py-3 bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] hover:border-white/[0.15] rounded-xl text-sm text-white font-display tracking-wider uppercase transition-all duration-300"
            data-testid="button-start-synergy"
          >
            <Zap className="w-4 h-4 inline-block mr-2 -mt-0.5" />
            {t('synergy.start')}
          </button>
          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 text-red-400 text-sm"
              data-testid="text-synergy-error"
            >
              {error}
            </motion.p>
          )}
        </motion.div>
      )}

      {loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-lg mx-auto text-center mt-16"
        >
          <div className="relative w-16 h-16 mx-auto mb-6">
            <Loader2 className="w-16 h-16 text-indigo-400/30 animate-spin" />
            <Link2 className="w-7 h-7 text-indigo-400 absolute inset-0 m-auto animate-pulse" />
          </div>
          <p className="text-sm text-gray-400" data-testid="text-synergy-loading">{t('synergy.loading')}</p>
        </motion.div>
      )}

      {result && !loading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: appleEase as unknown as number[] }}
          className="space-y-6 mt-4"
        >
          <div className="flex items-start gap-6 p-5 bg-white/[0.02] border border-white/[0.06] rounded-2xl">
            <RatingRing rating={result.overallRating} />
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-sm text-white/60 uppercase tracking-[0.15em] mb-2" data-testid="text-synergy-label">
                {t('synergy.overallLabel')}
              </h3>
              <p className="text-sm text-gray-300 leading-relaxed" data-testid="text-synergy-summary">
                {result.summary}
              </p>
            </div>
            <button
              onClick={analyze}
              className="shrink-0 p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
              data-testid="button-rerun-synergy"
            >
              <RefreshCw className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {result.synergies.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-emerald-400" />
                <h4 className="font-display text-xs uppercase tracking-[0.15em] text-white/60" data-testid="text-synergies-heading">
                  {t('synergy.combosTitle')}
                </h4>
              </div>
              <div className="space-y-3">
                <AnimatePresence>
                  {result.synergies.map((syn, i) => (
                    <motion.div
                      key={`syn-${i}`}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.08, duration: 0.4, ease: appleEase as unknown as number[] }}
                      className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl hover:border-white/[0.1] transition-colors"
                      data-testid={`card-synergy-${i}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Link2 className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="font-display text-sm text-white tracking-wide">{syn.name}</span>
                        </div>
                        <StrengthBadge strength={syn.strength} t={t} />
                      </div>

                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {syn.items.map((item, j) => (
                          <span key={j} className="px-2 py-0.5 text-[10px] bg-white/[0.04] border border-white/[0.08] rounded-md text-gray-300">
                            {item}
                          </span>
                        ))}
                        {syn.perks.map((perk, j) => (
                          <span key={`p-${j}`} className="px-2 py-0.5 text-[10px] bg-indigo-500/10 border border-indigo-500/20 rounded-md text-indigo-300">
                            {perk}
                          </span>
                        ))}
                      </div>

                      <p className="text-xs text-gray-400 leading-relaxed">{syn.explanation}</p>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          {result.antiSynergies.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h4 className="font-display text-xs uppercase tracking-[0.15em] text-white/60" data-testid="text-anti-synergies-heading">
                  {t('synergy.conflictsTitle')}
                </h4>
              </div>
              <div className="space-y-3">
                {result.antiSynergies.map((anti, i) => (
                  <motion.div
                    key={`anti-${i}`}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: (result.synergies.length + i) * 0.08, duration: 0.4, ease: appleEase as unknown as number[] }}
                    className="p-4 bg-amber-500/[0.02] border border-amber-500/10 rounded-xl"
                    data-testid={`card-anti-synergy-${i}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400/70" />
                      <span className="font-display text-sm text-amber-300/90 tracking-wide">{anti.issue}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {anti.items.map((item, j) => (
                        <span key={j} className="px-2 py-0.5 text-[10px] bg-amber-500/10 border border-amber-500/20 rounded-md text-amber-300/80">
                          {item}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed mb-2 break-words">{anti.explanation}</p>
                    <div className="flex items-start gap-1.5 text-xs text-emerald-400/80">
                      <Shield className="w-3 h-3 shrink-0 mt-0.5" />
                      <span className="break-words">{anti.fix}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {result.suggestions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ArrowRightLeft className="w-4 h-4 text-indigo-400" />
                <h4 className="font-display text-xs uppercase tracking-[0.15em] text-white/60" data-testid="text-suggestions-heading">
                  {t('synergy.suggestionsTitle')}
                </h4>
              </div>
              <div className="space-y-2">
                {result.suggestions.map((sug, i) => (
                  <motion.div
                    key={`sug-${i}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: (result.synergies.length + result.antiSynergies.length + i) * 0.08, duration: 0.3, ease: appleEase as unknown as number[] }}
                    className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-xl"
                    data-testid={`card-suggestion-${i}`}
                  >
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-xs text-red-400/80 line-through truncate max-w-[40%]">{sug.current}</span>
                      <ChevronRight className="w-3 h-3 text-gray-600 shrink-0" />
                      <span className="text-xs text-emerald-400 font-medium truncate max-w-[40%]">{sug.recommended}</span>
                    </div>
                    <p className="text-[10px] text-gray-500 leading-relaxed break-words">{sug.reason}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}