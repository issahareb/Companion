import { Mail, Sparkles, Download, Package } from 'lucide-react';
import { TierStars } from './TierStars';
import { motion } from 'framer-motion';
import type { InventoryItem, CharacterData } from '@/hooks/use-profile-state';
import { useI18n } from '@/lib/i18n';

function getRarityBg(rarity: string): string {
  switch (rarity) {
    case 'exotic': return 'bg-gradient-to-br from-[#ceae33]/30 via-[#ceae33]/10 to-[#ceae33]/5';
    case 'legendary': return 'bg-gradient-to-br from-[#522f65]/40 via-[#522f65]/15 to-[#522f65]/5';
    case 'rare': return 'bg-gradient-to-br from-[#5076a3]/30 via-[#5076a3]/10 to-transparent';
    default: return 'bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent';
  }
}

function getRarityColor(rarity: string): string {
  switch (rarity) {
    case 'exotic': return '#ceae33';
    case 'legendary': return '#522f65';
    case 'rare': return '#5076a3';
    default: return '#333';
  }
}

function getRarityBorder(rarity: string): string {
  switch (rarity) {
    case 'exotic': return 'border-[#ceae33]/30 hover:border-[#ceae33]/60';
    case 'legendary': return 'border-[#522f65]/40 hover:border-[#522f65]/70';
    case 'rare': return 'border-[#5076a3]/30 hover:border-[#5076a3]/60';
    default: return 'border-white/[0.08] hover:border-white/20';
  }
}

const appleEase = [0.16, 1, 0.3, 1] as const;

function PostmasterCharSection({ char, charPostItems, handlePullPostmaster, isPullPending, index }: {
  char: CharacterData;
  charPostItems: InventoryItem[];
  handlePullPostmaster: (item: InventoryItem) => void;
  isPullPending: boolean;
  index: number;
}) {
  const { t } = useI18n();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.5, ease: appleEase }}
      data-testid={`section-postmaster-${char.characterId}`}
    >
      <div className="flex items-center gap-3 mb-4">
        <img src={char.emblemPath} alt="" className="w-10 h-10 rounded-sm border border-white/10" />
        <div>
          <h3 className="font-display text-sm tracking-[0.2em] uppercase text-white">{char.className}</h3>
          <p className="text-[9px] text-gray-500 tracking-widest uppercase">{charPostItems.length} {t('postmaster.items')}</p>
        </div>
      </div>
      {charPostItems.length === 0 ? (
        <div className="flex items-center gap-3 py-6 px-4 border border-white/[0.04] bg-white/[0.01] rounded">
          <Mail className="w-5 h-5 text-gray-600" />
          <p className="text-[10px] text-gray-600 uppercase tracking-widest">{t('postmaster.empty')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {charPostItems.map((item, i) => {
            const imgSrc = item.icon || item.screenshot || '';
            const isExotic = item.rarity === 'exotic';
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: i * 0.04, duration: 0.4, ease: appleEase }}
                className={`border overflow-hidden rounded-lg transition-all duration-300 group ${getRarityBorder(item.rarity)}`}
                data-testid={`card-postmaster-${item.id}`}
              >
                <div className={`aspect-square relative overflow-hidden rounded-t-lg ${getRarityBg(item.rarity)}`}>
                  <div className="absolute top-0 left-0 right-0 h-[2px] z-10" style={{ backgroundColor: getRarityColor(item.rarity) }} />
                  {imgSrc ? (
                    <img src={imgSrc} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement?.querySelector('.img-fallback')?.classList.remove('hidden'); }} />
                  ) : null}
                  <div className={`img-fallback w-full h-full flex items-center justify-center absolute inset-0 ${imgSrc ? 'hidden' : ''}`}>
                    <Package className="w-8 h-8 text-gray-600" />
                  </div>
                  <div className="absolute bottom-1 left-1 z-10">
                    <TierStars rarity={item.rarity} />
                  </div>
                </div>
                <div className="px-1.5 py-1.5 bg-[#0a0e18]/90 rounded-b-lg">
                  <h4 className="text-[8px] font-bold truncate tracking-wider uppercase" style={{ color: isExotic ? '#E5C76B' : '#e0e0e0' }}>{item.name}</h4>
                  <p className="text-[7px] text-gray-500 mt-0.5 uppercase tracking-widest truncate">{item.type}</p>
                  <div className="flex items-center justify-between mt-1">
                    {item.power > 0 && (
                      <p className="text-[8px] text-gray-400 flex items-center gap-0.5">
                        <Sparkles className="w-2 h-2 text-[#E5C76B]" /> {item.power}
                      </p>
                    )}
                    <motion.button
                      onClick={() => handlePullPostmaster(item)}
                      disabled={isPullPending}
                      className="flex items-center gap-1 px-2 py-1 text-[7px] uppercase tracking-widest text-amber-400 hover:text-white bg-amber-500/10 hover:bg-amber-500/30 border border-amber-500/20 rounded transition-all sm:opacity-0 sm:group-hover:opacity-100"
                      whileTap={{ scale: 0.92 }}
                      data-testid={`button-pull-${item.id}`}
                    >
                      <Download className="w-3 h-3" /> {t('action.pullPostmaster')}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

interface PostmasterPanelProps {
  tabDirection: number;
  characters: CharacterData[];
  postmasterItems: InventoryItem[];
  handlePullPostmaster: (item: InventoryItem) => void;
  isPullPending: boolean;
}

export function PostmasterPanel({
  tabDirection, characters, postmasterItems, handlePullPostmaster, isPullPending,
}: PostmasterPanelProps) {
  const { t } = useI18n();

  return (
    <motion.div key="postmaster" initial={{ opacity: 0, x: tabDirection * 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: tabDirection * -40 }} transition={{ duration: 0.4, ease: appleEase }} className="h-full overflow-y-auto p-4 md:p-8 scroll-container" data-scroll-container>
      {postmasterItems.length === 0 && characters.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: appleEase }}
          className="flex flex-col items-center justify-center h-64 text-gray-500 space-y-6"
        >
          <Mail className="w-16 h-16 opacity-10" />
          <p className="font-display tracking-[0.3em] uppercase text-xs">{t('postmaster.empty')}</p>
          <p className="text-xs text-gray-600 max-w-md text-center">{t('postmaster.emptyDesc')}</p>
        </motion.div>
      ) : (
        <div className="space-y-8">
          {[...characters]
            .sort((a, b) => new Date(b.dateLastPlayed).getTime() - new Date(a.dateLastPlayed).getTime())
            .map((char, i) => {
              const charPostItems = postmasterItems.filter(item => item.characterId === char.characterId);
              return (
                <PostmasterCharSection
                  key={char.characterId}
                  char={char}
                  charPostItems={charPostItems}
                  handlePullPostmaster={handlePullPostmaster}
                  isPullPending={isPullPending}
                  index={i}
                />
              );
            })}
        </div>
      )}
    </motion.div>
  );
}
