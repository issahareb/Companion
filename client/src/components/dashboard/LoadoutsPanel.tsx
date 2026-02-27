import { Loader2, Share2, Check, Archive, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Item } from '@/components/Inventory';
import { useI18n } from '@/lib/i18n';
import type { TabType } from './shared';

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
    <motion.div key="loadouts" initial={{ opacity: 0, x: tabDirection * 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: tabDirection * -30 }} transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }} className="h-full p-4 md:p-8 overflow-y-auto">
      {isLoadingLoadouts ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
      ) : savedLoadouts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-500 space-y-6">
          <Archive className="w-16 h-16 opacity-10" />
          <p className="font-display tracking-[0.3em] uppercase text-xs">Keine Loadouts gespeichert</p>
          <p className="text-xs text-gray-600 max-w-md text-center">{t('loadouts.empty')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {savedLoadouts.map((saved) => (
            <div key={saved.id} className="bg-gradient-to-b from-white/[0.03] to-transparent border border-white/[0.08] p-4 group destiny-clip-sm hover:border-white/25 transition-all duration-500" data-testid={`card-loadout-${saved.id}`}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-white font-display text-base font-light tracking-wider">{saved.name}</h3>
                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1 font-mono">
                    {new Date(saved.createdAt!).toLocaleDateString('de-DE')}
                  </p>
                </div>
                <div className="flex space-x-1.5">
                  {saved.shareCode && (
                    <button onClick={() => copyToClipboard(saved.shareCode!)} className="w-8 h-8 bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-all destiny-clip-sm border border-white/5" title="Teilen" data-testid={`button-share-${saved.id}`}>
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button onClick={() => { setLoadout(saved.items as Record<string, Item>); setActiveTab('vault'); toast({ title: t('toast.loadoutAdopted') }); }}
                    className="w-8 h-8 bg-indigo-500/20 flex items-center justify-center text-indigo-400 hover:bg-white hover:text-black transition-all destiny-clip-sm border border-indigo-500/20" title="Laden" data-testid={`button-load-${saved.id}`}>
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteLoadout(saved.id)}
                    className="w-8 h-8 bg-red-500/10 flex items-center justify-center text-red-400 hover:bg-red-500 hover:text-white transition-all destiny-clip-sm border border-red-500/10 opacity-0 group-hover:opacity-100" title="Löschen" data-testid={`button-delete-${saved.id}`}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-8 gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                {Object.values(saved.items as Record<string, Item>).map((item: any, i) => (
                  <div key={i} className="aspect-square border border-white/10 bg-black relative overflow-hidden destiny-clip-sm">
                    <img src={item.screenshot || item.icon} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
