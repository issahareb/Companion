import { Search, Trophy, Check } from 'lucide-react';
import { appleEase } from './shared';
import { motion } from 'framer-motion';
import type { RecordItem } from '@/hooks/use-profile-state';
import { useI18n } from '@/lib/i18n';


function TriumphRecord({ record, index }: { record: RecordItem; index: number }) {
  const { t } = useI18n();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.025, 0.4), duration: 0.4, ease: appleEase }}
      className={`border transition-all duration-300 p-3 will-change-transform ${
        record.completed
          ? 'bg-gradient-to-r from-[#E5C76B]/[0.06] to-transparent border-[#E5C76B]/20 hover:border-[#E5C76B]/40'
          : 'bg-gradient-to-r from-white/[0.02] to-transparent border-white/[0.06] hover:border-white/15'
      } hover-lift`}
      data-testid={`record-${record.recordHash}`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 shrink-0 flex items-center justify-center overflow-hidden ring-1 ${
          record.completed ? 'ring-[#E5C76B]/30' : 'ring-white/10'
        }`}>
          {record.icon ? (
            <img src={record.icon} alt="" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <Trophy className={`w-5 h-5 ${record.completed ? 'text-[#E5C76B]' : 'text-gray-600'}`} />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={`text-[10px] font-bold tracking-wider uppercase truncate ${
              record.completed ? 'text-[#E5C76B]' : 'text-white'
            }`}>{record.name}</h4>
            {record.completed && (
              <div className="shrink-0 w-4 h-4 bg-green-500/80 rounded-full flex items-center justify-center">
                <Check className="w-2.5 h-2.5 text-white" />
              </div>
            )}
            {record.scoreValue > 0 && (
              <span className="text-[8px] text-[#E5C76B]/60 shrink-0">{record.scoreValue} pts</span>
            )}
          </div>
          {record.description && (
            <p className="text-[9px] text-gray-500 mt-0.5 line-clamp-2">{record.description}</p>
          )}
          {record.objectives.length > 0 && !record.completed && (
            <div className="mt-2 space-y-1.5">
              {record.objectives.map((obj, i) => {
                const pct = obj.completionValue > 0 ? Math.min(100, (obj.progress / obj.completionValue) * 100) : 0;
                return (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[8px] text-gray-500 truncate flex-1">{obj.description || t('triumphs.progress')}</span>
                      <span className="text-[8px] text-gray-400 shrink-0 ml-2">
                        {obj.progress.toLocaleString()}/{obj.completionValue.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full progress-animated ${
                          obj.complete ? 'bg-green-500' : 'bg-indigo-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

interface TriumphsPanelProps {
  tabDirection: number;
  triumphsSearch: string;
  setTriumphsSearch: (s: string) => void;
  triumphsFilter: 'all' | 'completed' | 'incomplete';
  setTriumphsFilter: (f: 'all' | 'completed' | 'incomplete') => void;
  filteredRecords: RecordItem[];
}

export function TriumphsPanel({
  tabDirection, triumphsSearch, setTriumphsSearch,
  triumphsFilter, setTriumphsFilter, filteredRecords,
}: TriumphsPanelProps) {
  const { t } = useI18n();

  return (
    <motion.div key="triumphs" initial={{ opacity: 0, x: tabDirection * 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: tabDirection * -40 }} transition={{ duration: 0.4, ease: appleEase }} className="h-full flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5, ease: appleEase }}
        className="p-4 md:p-6 pb-2 shrink-0 space-y-3"
      >
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
          <input
            type="text"
            placeholder={t('triumphs.search')}
            value={triumphsSearch}
            onChange={(e) => setTriumphsSearch(e.target.value)}
            className="w-full bg-[#0a0e18]/80 border border-white/[0.08] text-white pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-indigo-500/40 transition-all font-light tracking-wider destiny-clip-sm"
            data-testid="input-search-triumphs"
          />
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'completed', 'incomplete'] as const).map(f => (
            <motion.button
              key={f}
              onClick={() => setTriumphsFilter(f)}
              className={`px-3 py-1.5 text-[9px] uppercase tracking-widest border transition-all press-scale ${
                triumphsFilter === f
                  ? 'bg-indigo-600/30 border-indigo-500/50 text-white'
                  : 'bg-white/5 border-white/5 text-gray-500 hover:text-white'
              }`}
              whileTap={{ scale: 0.94 }}
              data-testid={`filter-triumphs-${f}`}
            >
              {f === 'all' ? t('triumphs.all') : f === 'completed' ? t('triumphs.completed') : t('triumphs.incomplete')}
            </motion.button>
          ))}
          <span className="text-[10px] text-gray-600 ml-2">
            {t('triumphs.score')}: {filteredRecords.filter(r => r.completed).reduce((sum, r) => sum + r.scoreValue, 0).toLocaleString()}
          </span>
        </div>
      </motion.div>
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pt-2 scroll-container" data-scroll-container>
        {filteredRecords.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center h-64 space-y-4"
          >
            <Trophy className="w-12 h-12 text-gray-700" />
            <p className="text-sm text-gray-500">{t('item.noneAvailable')}</p>
          </motion.div>
        ) : (
          <div className="space-y-2">
            {filteredRecords.slice(0, 100).map((record, i) => (
              <TriumphRecord key={record.recordHash} record={record} index={i} />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
