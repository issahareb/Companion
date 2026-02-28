import { useState } from 'react';
import { Loader2, Share2, Check, Archive, Trash2, Gamepad2, ExternalLink } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Item } from '@/components/Inventory';
import type { InGameLoadout, CharacterData } from '@/hooks/use-profile-state';
import { useI18n } from '@/lib/i18n';
import type { TabType } from './shared';
import { apiRequest } from '@/lib/queryClient';

const appleEase = [0.16, 1, 0.3, 1] as const;

interface LoadoutsPanelProps {
  tabDirection: number;
  isLoadingLoadouts: boolean;
  savedLoadouts: any[];
  copyToClipboard: (code: string) => void;
  setLoadout: (loadout: Record<string, Item>) => void;
  setActiveTab: (tab: TabType) => void;
  handleDeleteLoadout: (id: number) => void;
  toast: (opts: any) => void;
  inGameLoadouts: Record<string, InGameLoadout[]>;
  characters: CharacterData[];
}

export function LoadoutsPanel({
  tabDirection, isLoadingLoadouts, savedLoadouts, copyToClipboard,
  setLoadout, setActiveTab, handleDeleteLoadout, toast,
  inGameLoadouts, characters,
}: LoadoutsPanelProps) {
  const { t } = useI18n();
  const [sharingIndex, setSharingIndex] = useState<string | null>(null);

  const shareInGameLoadout = async (loadout: InGameLoadout, character: CharacterData) => {
    const key = `${character.characterId}-${loadout.index}`;
    setSharingIndex(key);
    try {
      const items: Record<string, any> = {};
      for (const item of loadout.items) {
        if (item.slot && item.name) {
          items[item.slot] = {
            id: item.itemInstanceId,
            itemHash: item.itemHash,
            name: item.name,
            icon: item.icon,
            slot: item.slot,
            rarity: 'legendary',
            power: 0,
          };
        }
      }
      const res = await apiRequest('POST', '/api/loadouts/share-ingame', {
        name: `${loadout.name} (${character.className})`,
        items,
        classType: character.classType ?? null,
      });
      const data = await res.json();
      const shareUrl = `${window.location.origin}/share/${data.shareCode}`;
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: t('ingame.linkCopied') });
    } catch {
      toast({ title: t('share.equipError'), variant: 'destructive' });
    } finally {
      setSharingIndex(null);
    }
  };

  const hasInGameLoadouts = characters.some(c => (inGameLoadouts[c.characterId] || []).length > 0);

  return (
    <motion.div key="loadouts" initial={{ opacity: 0, x: tabDirection * 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: tabDirection * -40 }} transition={{ duration: 0.4, ease: appleEase }} className="h-full p-4 md:p-8 overflow-y-auto scroll-container" data-scroll-container>
      {hasInGameLoadouts && (
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <Gamepad2 className="w-5 h-5 text-indigo-400" />
            <h2 className="font-display text-sm tracking-[0.2em] text-white uppercase" data-testid="text-ingame-loadouts-title">{t('ingame.loadouts')}</h2>
          </div>

          <div className="space-y-6">
            {characters.map(character => {
              const charLoadouts = inGameLoadouts[character.characterId] || [];
              if (charLoadouts.length === 0) return null;

              return (
                <div key={character.characterId}>
                  <div className="flex items-center gap-2 mb-3">
                    {character.emblemPath && (
                      <img src={character.emblemPath} alt="" className="w-6 h-6 rounded" />
                    )}
                    <span className="text-xs text-gray-400 font-display tracking-[0.15em] uppercase">{character.className}</span>
                    <span className="text-[10px] text-gray-600">· {character.light}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {charLoadouts.map((loadout, li) => {
                      const sharingKey = `${character.characterId}-${loadout.index}`;
                      const isSharing = sharingIndex === sharingKey;

                      return (
                        <motion.div
                          key={loadout.index}
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: li * 0.05, duration: 0.4, ease: appleEase }}
                          className="bg-white/[0.02] border border-white/[0.06] rounded-lg p-3 group hover:border-indigo-500/30 transition-all duration-300 hover-lift"
                          data-testid={`card-ingame-loadout-${character.characterId}-${loadout.index}`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {loadout.icon && (
                                <img src={loadout.icon} alt="" className="w-6 h-6 shrink-0" />
                              )}
                              <span className="text-xs text-white font-medium truncate">{loadout.name || `Loadout ${loadout.index + 1}`}</span>
                            </div>
                            <motion.button
                              onClick={() => shareInGameLoadout(loadout, character)}
                              disabled={isSharing}
                              className="shrink-0 w-7 h-7 bg-white/[0.04] hover:bg-indigo-500/20 flex items-center justify-center text-gray-500 hover:text-indigo-400 transition-all rounded border border-white/[0.06] disabled:opacity-50"
                              whileTap={{ scale: 0.9 }}
                              title={t('ingame.shareLoadout')}
                              data-testid={`button-share-ingame-${loadout.index}`}
                            >
                              {isSharing ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <ExternalLink className="w-3 h-3" />
                              )}
                            </motion.button>
                          </div>

                          <div className="grid grid-cols-8 gap-1">
                            {loadout.items.slice(0, 8).map((item, idx) => (
                              <div
                                key={idx}
                                className="aspect-square border border-white/[0.06] bg-black/40 overflow-hidden rounded-sm"
                                title={item.name}
                              >
                                {item.icon && (
                                  <img src={item.icon} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                                )}
                              </div>
                            ))}
                            {Array.from({ length: Math.max(0, 8 - loadout.items.length) }).map((_, idx) => (
                              <div key={`empty-${idx}`} className="aspect-square border border-white/[0.04] bg-black/20 rounded-sm" />
                            ))}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 mb-4">
        <Archive className="w-5 h-5 text-gray-500" />
        <h2 className="font-display text-sm tracking-[0.2em] text-white uppercase">{t('nav.loadouts')}</h2>
      </div>

      {isLoadingLoadouts ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : savedLoadouts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: appleEase }}
          className="flex flex-col items-center justify-center h-40 text-gray-500 space-y-4"
        >
          <p className="text-xs text-gray-600 max-w-md text-center">{t('loadouts.empty')}</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {savedLoadouts.map((saved, i) => (
            <motion.div
              key={saved.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.06, duration: 0.5, ease: appleEase }}
              className="bg-gradient-to-b from-white/[0.03] to-transparent border border-white/[0.08] p-4 group destiny-clip-sm hover:border-white/25 transition-all duration-500 hover-lift card-sheen"
              data-testid={`card-loadout-${saved.id}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-white font-display text-base font-light tracking-wider">{saved.name}</h3>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1 font-mono">
                    {new Date(saved.createdAt!).toLocaleDateString('de-DE')}
                  </p>
                </div>
                <div className="flex space-x-1.5">
                  {saved.shareCode && (
                    <motion.button
                      onClick={() => copyToClipboard(saved.shareCode!)}
                      className="w-8 h-8 bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-all destiny-clip-sm border border-white/5"
                      whileTap={{ scale: 0.9 }}
                      title="Teilen"
                      data-testid={`button-share-${saved.id}`}
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </motion.button>
                  )}
                  <motion.button
                    onClick={() => { setLoadout(saved.items as Record<string, Item>); setActiveTab('vault'); toast({ title: t('toast.loadoutAdopted') }); }}
                    className="w-8 h-8 bg-indigo-500/20 flex items-center justify-center text-indigo-400 hover:bg-white hover:text-black transition-all destiny-clip-sm border border-indigo-500/20"
                    whileTap={{ scale: 0.9 }}
                    title="Laden"
                    data-testid={`button-load-${saved.id}`}
                  >
                    <Check className="w-4 h-4" />
                  </motion.button>
                  <motion.button
                    onClick={() => handleDeleteLoadout(saved.id)}
                    className="w-8 h-8 bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all destiny-clip-sm border border-red-500/10 opacity-0 group-hover:opacity-100"
                    whileTap={{ scale: 0.9 }}
                    title="Loschen"
                    data-testid={`button-delete-${saved.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </motion.button>
                </div>
              </div>
              <div className="grid grid-cols-8 gap-1 opacity-60 group-hover:opacity-100 transition-opacity duration-500">
                {Object.values(saved.items as Record<string, Item>).map((item: any, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.06 + idx * 0.03, duration: 0.3, ease: appleEase }}
                    className="aspect-square border border-white/10 bg-black relative overflow-hidden destiny-clip-sm"
                  >
                    <img src={item.screenshot || item.icon} alt={item.name} className="w-full h-full object-cover" />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
