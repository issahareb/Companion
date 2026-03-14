import { TrendingUp } from 'lucide-react';
import { appleEase } from './shared';
import { motion } from 'framer-motion';
import type { CharacterData } from '@/hooks/use-profile-state';
import { useI18n } from '@/lib/i18n';


interface SeasonPanelProps {
  tabDirection: number;
  selectedCharacter: CharacterData | null;
}

export function SeasonPanel({ tabDirection, selectedCharacter }: SeasonPanelProps) {
  const { t } = useI18n();

  return (
    <motion.div key="season" initial={{ opacity: 0, x: tabDirection * 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: tabDirection * -40 }} transition={{ duration: 0.4, ease: appleEase }} className="h-full overflow-y-auto p-4 md:p-8 scroll-container" data-scroll-container>
      {selectedCharacter ? (
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5, ease: appleEase }}
          >
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400/70" />
              <h4 className="text-[10px] text-white/70 uppercase tracking-[0.2em] font-display">{t('season.progressions')}</h4>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>
            {(selectedCharacter.progressions || []).length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center h-32 text-gray-600"
              >
                <TrendingUp className="w-8 h-8 opacity-20 mb-2" />
                <p className="text-[10px] uppercase tracking-widest">{t('item.noneAvailable')}</p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {selectedCharacter.progressions.slice(0, 30).map((prog, i) => {
                  const pct = prog.nextLevelAt > 0 ? Math.min(100, (prog.progressToNextLevel / prog.nextLevelAt) * 100) : 100;
                  return (
                    <motion.div
                      key={prog.progressionHash}
                      initial={{ opacity: 0, y: 16, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: Math.min(i * 0.04, 0.5), duration: 0.45, ease: appleEase }}
                      className="bg-gradient-to-r from-white/[0.03] to-transparent border border-white/[0.06] p-3 hover:border-indigo-500/20 transition-all duration-300 hover-lift will-change-transform"
                      data-testid={`progression-${prog.progressionHash}`}
                    >
                      <div className="flex items-center gap-3 mb-2">
                        {prog.icon ? (
                          <img src={prog.icon} alt="" className="w-8 h-8 ring-1 ring-white/10" />
                        ) : (
                          <div className="w-8 h-8 bg-indigo-500/10 flex items-center justify-center ring-1 ring-white/10">
                            <TrendingUp className="w-4 h-4 text-indigo-400/50" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold truncate tracking-wider uppercase text-white">{prog.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[9px] text-indigo-400">{t('season.level')} {prog.level}</span>
                            {prog.currentResetCount > 0 && (
                              <span className="text-[8px] text-[#E5C76B]">{t('season.resets')}: {prog.currentResetCount}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full progress-animated"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[8px] text-gray-600 mt-1 text-right">
                        {prog.progressToNextLevel.toLocaleString()}/{prog.nextLevelAt > 0 ? prog.nextLevelAt.toLocaleString() : '\u2014'}
                      </p>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: appleEase }}
          className="flex flex-col items-center justify-center h-64 text-gray-500 space-y-4"
        >
          <TrendingUp className="w-12 h-12 opacity-10" />
          <p className="text-sm">{t('item.noneAvailable')}</p>
        </motion.div>
      )}
    </motion.div>
  );
}
