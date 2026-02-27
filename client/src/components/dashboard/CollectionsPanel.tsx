import { Search, BookOpen, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import type { CollectibleItem } from '@/hooks/use-profile-state';
import { useI18n } from '@/lib/i18n';

interface CollectionsPanelProps {
  tabDirection: number;
  collectionsSearch: string;
  setCollectionsSearch: (s: string) => void;
  collectionsFilter: 'all' | 'acquired' | 'notAcquired';
  setCollectionsFilter: (f: 'all' | 'acquired' | 'notAcquired') => void;
  filteredCollectibles: CollectibleItem[];
}

export function CollectionsPanel({
  tabDirection, collectionsSearch, setCollectionsSearch,
  collectionsFilter, setCollectionsFilter, filteredCollectibles,
}: CollectionsPanelProps) {
  const { t } = useI18n();

  return (
    <motion.div key="collections" initial={{ opacity: 0, x: tabDirection * 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: tabDirection * -30 }} transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }} className="h-full flex flex-col">
      <div className="p-4 md:p-6 pb-2 shrink-0 space-y-3">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
          <input
            type="text"
            placeholder={t('collections.search')}
            value={collectionsSearch}
            onChange={(e) => setCollectionsSearch(e.target.value)}
            className="w-full bg-[#0a0e18]/80 border border-white/[0.08] text-white pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-indigo-500/40 transition-all font-light tracking-wider destiny-clip-sm"
            data-testid="input-search-collections"
          />
        </div>
        <div className="flex items-center gap-2">
          {(['all', 'acquired', 'notAcquired'] as const).map(f => (
            <button
              key={f}
              onClick={() => setCollectionsFilter(f)}
              className={`px-3 py-1.5 text-[9px] uppercase tracking-widest border transition-all ${
                collectionsFilter === f
                  ? 'bg-indigo-600/30 border-indigo-500/50 text-white'
                  : 'bg-white/5 border-white/5 text-gray-500 hover:text-white'
              }`}
              data-testid={`filter-collections-${f}`}
            >
              {f === 'all' ? t('collections.all') : f === 'acquired' ? t('collections.acquired') : t('collections.notAcquired')}
            </button>
          ))}
          <span className="text-[10px] text-gray-600 ml-2">
            {filteredCollectibles.filter(c => c.acquired).length}/{filteredCollectibles.length} {t('collections.acquired').toLowerCase()}
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 md:p-6 pt-2">
        {filteredCollectibles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 space-y-4">
            <BookOpen className="w-12 h-12 text-gray-700" />
            <p className="text-sm text-gray-500">{t('item.noneAvailable')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2">
            {filteredCollectibles.slice(0, 200).map(c => (
              <div
                key={c.collectibleHash}
                className={`group relative border transition-all duration-300 destiny-clip-sm ${
                  c.acquired
                    ? 'bg-gradient-to-b from-white/[0.04] to-transparent border-white/[0.08] hover:border-indigo-500/30'
                    : 'bg-black/40 border-white/[0.04] opacity-40 grayscale hover:opacity-70'
                }`}
                data-testid={`collectible-${c.collectibleHash}`}
              >
                <div className={`h-[2px] w-full ${c.acquired ? 'bg-indigo-500/60' : 'bg-gray-700/40'}`} />
                <div className="aspect-square relative overflow-hidden bg-black/60 flex items-center justify-center p-2">
                  {c.icon ? (
                    <img src={c.icon} alt={c.name} className="w-full h-full object-contain" loading="lazy" />
                  ) : (
                    <BookOpen className="w-8 h-8 text-gray-700" />
                  )}
                  {c.acquired && (
                    <div className="absolute top-1 right-1 w-4 h-4 bg-green-500/80 rounded-full flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </div>
                <div className="px-2 py-1.5">
                  <p className="text-[8px] font-bold truncate tracking-wider uppercase text-white">{c.name}</p>
                  {c.sourceString && (
                    <p className="text-[8px] text-gray-600 truncate mt-0.5">{c.sourceString}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
