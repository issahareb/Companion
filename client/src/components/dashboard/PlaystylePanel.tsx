import { useState, useCallback } from 'react';
import { appleEase } from './shared';
import { motion } from 'framer-motion';
import { Brain, Zap, AlertTriangle, Shield, Target, Lightbulb, RefreshCw, Loader2, TrendingUp, ChevronRight } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { CharacterData, ArtifactInfo } from '@/hooks/use-profile-state';
import { apiRequest } from '@/lib/queryClient';

interface PlaystyleAnalysis {
  playstyle: string;
  summary: string;
  rating: number;
  strengths: string[];
  weaknesses: string[];
  synergies: string[];
  tips: string[];
}

interface PlaystylePanelProps {
  tabDirection: number;
  selectedCharacter: CharacterData | null;
  artifact?: ArtifactInfo;
}


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
    <div className="relative" style={{ width: size, height: size }} data-testid="rating-ring">
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

export function PlaystylePanel({ tabDirection, selectedCharacter, artifact }: PlaystylePanelProps) {
  const { t, language } = useI18n();
  const [analysis, setAnalysis] = useState<PlaystyleAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = useCallback(async () => {
    if (!selectedCharacter) return;
    setIsLoading(true);
    setError(null);

    const characterData = {
      className: selectedCharacter.className,
      raceName: selectedCharacter.raceName,
      light: selectedCharacter.light,
      stats: selectedCharacter.stats.map(s => ({ name: s.name, value: s.value })),
      equippedItems: selectedCharacter.equippedItems.map(item => ({
        slot: item.slot,
        name: item.name,
        type: item.type,
        rarity: item.rarity,
        power: item.power,
        perks: (item.perks || []).map(p => ({ name: p.name, isActive: p.isActive })),
        mods: (item.mods || []).map(m => ({ name: m.name })),
      })),
      subclass: (() => {
        const subclassItem = selectedCharacter.equippedItems.find(i => i.slot === 'subclass');
        if (!subclassItem) return null;
        return {
          name: subclassItem.name,
          sockets: (subclassItem.sockets || []).map(s => ({ name: s.name, category: s.description || 'ability' })),
        };
      })(),
      artifact: artifact ? {
        powerBonus: artifact.powerBonus,
        activeMods: artifact.tiers.flatMap(tier => tier.items.filter(i => i.isActive).map(i => i.name)),
      } : null,
    };

    try {
      const res = await apiRequest('POST', '/api/ai/analyze-playstyle', { characterData, language });
      const data = await res.json();
      setAnalysis(data);
    } catch (err: any) {
      if (err.message?.includes('429') || err.message?.includes('rate limit')) {
        setError(t('analysis.rateLimit'));
      } else {
        setError(t('analysis.error'));
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedCharacter, artifact, language, t]);

  return (
    <motion.div
      key="playstyle"
      custom={tabDirection}
      variants={tabVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.45, ease: appleEase as unknown as number[] }}
      className="h-full overflow-y-auto overflow-x-hidden scroll-container px-4 md:px-8 py-6"
      data-scroll-container
      data-testid="panel-playstyle"
    >
      <div className="max-w-3xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: appleEase as unknown as number[] }}
          className="flex items-center gap-3 mb-2"
        >
          <Brain className="w-5 h-5 text-indigo-400" />
          <h2 className="font-display text-sm tracking-[0.2em] text-white uppercase">{t('analysis.title')}</h2>
        </motion.div>

        {!analysis && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: appleEase as unknown as number[], delay: 0.1 }}
            className="flex flex-col items-center justify-center py-16 space-y-6"
          >
            <div className="w-20 h-20 rounded-full bg-indigo-500/10 flex items-center justify-center animate-breathe">
              <Brain className="w-10 h-10 text-indigo-400" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-gray-400 text-sm max-w-md">{t('analysis.description')}</p>
              {selectedCharacter && (
                <p className="text-gray-600 text-xs">{selectedCharacter.className} · {selectedCharacter.light} Power</p>
              )}
            </div>
            <button
              onClick={runAnalysis}
              disabled={!selectedCharacter}
              className="press-scale px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed text-white text-xs font-display tracking-[0.2em] uppercase transition-all duration-300 destiny-clip-sm border border-indigo-500/30"
              data-testid="button-start-analysis"
            >
              {t('analysis.start')}
            </button>
            {error && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-400 text-xs flex items-center gap-2"
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
            <p className="text-gray-400 text-xs font-display tracking-[0.2em] uppercase">{t('analysis.loading')}</p>
          </motion.div>
        )}

        {analysis && !isLoading && (
          <div className="space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: appleEase as unknown as number[], delay: 0.1 }}
              className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6 hover-lift"
            >
              <div className="flex items-center gap-6">
                <RatingRing rating={analysis.rating} />
                <div className="flex-1 space-y-2">
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3, duration: 0.5, ease: appleEase as unknown as number[] }}
                  >
                    <span className="inline-block px-3 py-1 bg-indigo-500/20 border border-indigo-500/30 rounded-full text-indigo-300 text-xs font-display tracking-[0.15em] uppercase" data-testid="text-playstyle-label">
                      {analysis.playstyle}
                    </span>
                  </motion.div>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                    className="text-gray-400 text-sm leading-relaxed"
                    data-testid="text-playstyle-summary"
                  >
                    {analysis.summary}
                  </motion.p>
                </div>
              </div>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: appleEase as unknown as number[], delay: 0.2 }}
                className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 hover-lift"
              >
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-display text-xs tracking-[0.15em] text-emerald-400 uppercase">{t('analysis.strengths')}</h3>
                </div>
                <ul className="space-y-2" data-testid="list-strengths">
                  {analysis.strengths.map((s, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + i * 0.08, duration: 0.4, ease: appleEase as unknown as number[] }}
                      className="flex items-start gap-2 text-sm text-gray-300"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-emerald-500/60 mt-0.5 shrink-0" />
                      {s}
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
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <h3 className="font-display text-xs tracking-[0.15em] text-amber-400 uppercase">{t('analysis.weaknesses')}</h3>
                </div>
                <ul className="space-y-2" data-testid="list-weaknesses">
                  {analysis.weaknesses.map((w, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.08, duration: 0.4, ease: appleEase as unknown as number[] }}
                      className="flex items-start gap-2 text-sm text-gray-300"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-amber-500/60 mt-0.5 shrink-0" />
                      {w}
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: appleEase as unknown as number[], delay: 0.4 }}
              className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 hover-lift"
            >
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-purple-400" />
                <h3 className="font-display text-xs tracking-[0.15em] text-purple-400 uppercase">{t('analysis.synergies')}</h3>
              </div>
              <ul className="space-y-2" data-testid="list-synergies">
                {analysis.synergies.map((s, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.08, duration: 0.4, ease: appleEase as unknown as number[] }}
                    className="flex items-start gap-2 text-sm text-gray-300"
                  >
                    <Zap className="w-3.5 h-3.5 text-purple-500/60 mt-0.5 shrink-0" />
                    {s}
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: appleEase as unknown as number[], delay: 0.5 }}
              className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 hover-lift"
            >
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-[#E5C76B]" />
                <h3 className="font-display text-xs tracking-[0.15em] text-[#E5C76B] uppercase">{t('analysis.tips')}</h3>
              </div>
              <ul className="space-y-2" data-testid="list-tips">
                {analysis.tips.map((tip, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.08, duration: 0.4, ease: appleEase as unknown as number[] }}
                    className="flex items-start gap-2 text-sm text-gray-300"
                  >
                    <Target className="w-3.5 h-3.5 text-[#E5C76B]/60 mt-0.5 shrink-0" />
                    {tip}
                  </motion.li>
                ))}
              </ul>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="flex items-center justify-center pt-2 pb-8"
            >
              <button
                onClick={runAnalysis}
                className="press-scale flex items-center gap-2 px-5 py-2.5 bg-white/[0.04] hover:bg-white/[0.08] text-gray-400 hover:text-white text-xs font-display tracking-[0.15em] uppercase transition-all duration-300 border border-white/[0.06] rounded-lg"
                data-testid="button-reanalyze"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {t('analysis.rerun')}
              </button>
            </motion.div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
