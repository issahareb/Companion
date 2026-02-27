import { Mail, Sparkles, Download } from 'lucide-react';
import { motion } from 'framer-motion';
import type { InventoryItem, CharacterData } from '@/hooks/use-profile-state';
import { useI18n } from '@/lib/i18n';

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
    <motion.div key="postmaster" initial={{ opacity: 0, x: tabDirection * 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: tabDirection * -30 }} transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }} className="h-full overflow-y-auto p-4 md:p-8">
      {postmasterItems.length === 0 && characters.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500 space-y-6">
          <Mail className="w-16 h-16 opacity-10" />
          <p className="font-display tracking-[0.3em] uppercase text-xs">{t('postmaster.empty')}</p>
          <p className="text-xs text-gray-600 max-w-md text-center">{t('postmaster.emptyDesc')}</p>
        </div>
      ) : (
        <div className="space-y-8">
          {[...characters]
            .sort((a, b) => new Date(b.dateLastPlayed).getTime() - new Date(a.dateLastPlayed).getTime())
            .map(char => {
              const charPostItems = postmasterItems.filter(item => item.characterId === char.characterId);
              return (
                <div key={char.characterId} data-testid={`section-postmaster-${char.characterId}`}>
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
                      {charPostItems.map(item => (
                        <div key={item.id} className="bg-gradient-to-b from-amber-500/[0.03] to-transparent border border-amber-500/15 overflow-hidden destiny-clip-sm hover:border-amber-500/30 transition-all duration-300 group" data-testid={`card-postmaster-${item.id}`}>
                          <div className="h-[2px] w-full bg-amber-500/60" />
                          <div className="aspect-[4/3] relative overflow-hidden bg-black/80">
                            <img src={item.screenshot || item.icon} alt={item.name} className="w-full h-full object-cover brightness-90" />
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
                              <button
                                onClick={() => handlePullPostmaster(item)}
                                disabled={isPullPending}
                                className="flex items-center gap-1 px-2 py-1 text-[8px] uppercase tracking-widest text-amber-400 hover:text-white bg-amber-500/10 hover:bg-amber-500/30 border border-amber-500/20 transition-all opacity-0 group-hover:opacity-100"
                                data-testid={`button-pull-${item.id}`}
                              >
                                <Download className="w-3 h-3" /> {t('action.pullPostmaster')}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </motion.div>
  );
}
