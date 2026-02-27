import { Mail, Sparkles, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import type { InventoryItem, CharacterData } from '@/hooks/use-profile-state';
import { useI18n } from '@/lib/i18n';

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
          {charPostItems.map((item, i) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 16, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.04, duration: 0.4, ease: appleEase }}
              className="bg-gradient-to-b from-amber-500/[0.03] to-transparent border border-amber-500/15 overflow-hidden destiny-clip-sm hover:border-amber-500/30 transition-all duration-300 group hover-lift card-sheen"
              data-testid={`card-postmaster-${item.id}`}
            >
              <div className="h-[2px] w-full bg-amber-500/60" />
              <div className="aspect-[4/3] relative overflow-hidden bg-black/80">
                <img src={item.screenshot || item.icon} alt={item.name} className="w-full h-full object-cover brightness-90 transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e18] via-transparent to-transparent opacity-90" />
              </div>
              <div className="px-2.5 py-2">
                <h4 className="text-[9px] font-bold truncate tracking-wider uppercase text-amber-400">{item.name}</h4>
                <p className="text-[8px] text-gray-500 mt-0.5 uppercase tracking-widest">{item.type}</p>
                <div className="flex items-center justify-between mt-1">
                  {item.power > 0 && (
                    <p className="text-[9px] text-gray-400 flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-[#E5C76B]" /> {item.power}
                    </p>
                  )}
                  <motion.button
                    onClick={() => handlePullPostmaster(item)}
                    disabled={isPullPending}
                    className="flex items-center gap-1 px-2 py-1 text-[8px] uppercase tracking-widest text-amber-400 hover:text-white bg-amber-500/10 hover:bg-amber-500/30 border border-amber-500/20 transition-all opacity-0 group-hover:opacity-100"
                    whileTap={{ scale: 0.92 }}
                    data-testid={`button-pull-${item.id}`}
                  >
                    <Download className="w-3 h-3" /> {t('action.pullPostmaster')}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
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
