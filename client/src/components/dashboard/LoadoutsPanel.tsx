import { Loader2, Share2, Check, Archive, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Item } from '@/components/Inventory';
import { useI18n } from '@/lib/i18n';
import type { TabType } from './shared';

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
}

export function LoadoutsPanel({
  tabDirection, isLoadingLoadouts, savedLoadouts, copyToClipboard,
  setLoadout, setActiveTab, handleDeleteLoadout, toast,
}: LoadoutsPanelProps) {
  const { t } = useI18n();

  return (
    <motion.div key="loadouts" initial={{ opacity: 0, x: tabDirection * 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: tabDirection * -40 }} transition={{ duration: 0.4, ease: appleEase }} className="h-full p-4 md:p-8 overflow-y-auto scroll-container" data-scroll-container>
      {isLoadingLoadouts ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : savedLoadouts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: appleEase }}
          className="flex flex-col items-center justify-center h-64 text-gray-500 space-y-6"
        >
          <Archive className="w-16 h-16 opacity-10" />
          <p className="font-display tracking-[0.3em] uppercase text-xs">Keine Loadouts gespeichert</p>
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
              className="bg-gradient-to-b from-white/[0.03] to-transparent border border-white/[0.08] p-4 group destiny-clip-sm hover:border-white/25 transition-all duration-500 hover-lift"
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
