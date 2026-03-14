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
    <motion.div key="season" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: appleEase }} className="h-full overflow-y-auto p-4 md:p-6 scroll-container" data-scroll-container>
      {selectedCharacter ? (
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-400/70" />
              <h4 className="text-[11px] text-white/70 uppercase tracking-destiny-wide font-display">{t('season.progressions')}</h4>
              <div className="flex-1 h-px bg-white/[0.06]" />
            </div>
            {(selectedCharacter.progressions || []).length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-600">
                <TrendingUp className="w-8 h-8 opacity-20 mb-2" />
                <p className="text-[11px] uppercase tracking-destiny">{t('item.noneAvailable')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {selectedCharacter.progressions.slice(0, 30).map((prog) => {
                  const pct = prog.nextLevelAt > 0 ? Math.min(100, (prog.progressToNextLevel / prog.nextLevelAt) * 100) : 100;
                  return (
                    <div
                      key={prog.progressionHash}
                      className="bg-gradient-to-r from-white/[0.03] to-transparent border border-white/[0.06] p-3 hover:border-indigo-500/20 transition-all duration-300 item-card-hover"
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
                          <p className="text-[11px] font-bold truncate tracking-destiny uppercase text-white">{prog.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] text-indigo-400">{t('season.level')} {prog.level}</span>
                            {prog.currentResetCount > 0 && (
                              <span className="text-[11px] text-[var(--color-gold-accent)]">{t('season.resets')}: {prog.currentResetCount}</span>
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
                      <p className="text-[11px] text-gray-600 mt-1 text-right">
                        {prog.progressToNextLevel.toLocaleString()}/{prog.nextLevelAt > 0 ? prog.nextLevelAt.toLocaleString() : '\u2014'}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500 space-y-4">
          <TrendingUp className="w-12 h-12 opacity-10" />
          <p className="text-sm">{t('item.noneAvailable')}</p>
        </div>
      )}
    </motion.div>
  );
}
