import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CharacterData, SocketInfo } from '@/hooks/use-profile-state';
import { useInsertPlug } from '@/hooks/use-transfer';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';

export function SubclassEditor({ character, membershipType }: { character: CharacterData; membershipType: number }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const insertPlug = useInsertPlug();
  const [expandedSocket, setExpandedSocket] = useState<number | null>(null);

  const subclass = character.equippedItems.find(i => i.slot === 'subclass');
  if (!subclass) {
    return <p className="text-[10px] text-gray-700 uppercase tracking-widest italic">{t('item.none')}</p>;
  }

  const sockets = subclass.sockets || [];

  const SOCKET_CATEGORIES: { label: string; indices: number[]; group: string }[] = [
    { label: t('subclass.super'), indices: [0], group: 'super' },
    { label: t('subclass.classAbility'), indices: [1], group: 'ability' },
    { label: t('subclass.movement'), indices: [2], group: 'ability' },
    { label: t('subclass.melee'), indices: [3], group: 'ability' },
    { label: t('subclass.grenade'), indices: [4], group: 'ability' },
    { label: t('subclass.aspects'), indices: [5, 6], group: 'aspect' },
    { label: t('subclass.fragments'), indices: [7, 8, 9, 10, 11], group: 'fragment' },
  ];

  const handleSwapPlug = async (socketIndex: number, plugHash: number, plugName: string) => {
    try {
      await insertPlug.mutateAsync({
        itemInstanceId: subclass.id,
        socketIndex,
        plugItemHash: plugHash,
        characterId: character.characterId,
        membershipType,
      });
      toast({ title: t('toast.plugSwapped'), description: `${plugName} ${t('toast.plugSwappedDesc')}` });
      setExpandedSocket(null);
    } catch (err: any) {
      toast({ title: t('error.generic'), description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 p-3 bg-black/40 border border-white/[0.06]">
        <div className="w-12 h-12 shrink-0 overflow-hidden ring-1 ring-purple-500/30">
          <img src={subclass.icon} alt={subclass.name} className="w-full h-full object-cover" />
        </div>
        <div>
          <p className="text-[11px] font-bold tracking-wider uppercase text-purple-300">{subclass.name}</p>
          <p className="text-[8px] text-gray-500 uppercase tracking-wider">{subclass.type}</p>
        </div>
      </div>

      {SOCKET_CATEGORIES.map((cat) => {
        const catSockets = cat.indices
          .map(idx => sockets.find(s => s.socketIndex === idx))
          .filter(Boolean) as SocketInfo[];
        if (catSockets.length === 0) return null;

        return (
          <div key={cat.label} className="space-y-1">
            <p className="text-[8px] text-gray-500 uppercase tracking-[0.25em] font-medium px-1">{cat.label}</p>
            <div className={cat.group === 'fragment' ? 'grid grid-cols-2 sm:grid-cols-3 gap-1' : 'space-y-1'}>
              {catSockets.map((sock) => {
                const isOpen = expandedSocket === sock.socketIndex;
                const hasOptions = sock.reusablePlugs.length > 1;
                return (
                  <div key={sock.socketIndex}>
                    <div
                      className={`flex items-center gap-2 p-2 border transition-all duration-200 cursor-pointer ${
                        isOpen ? 'border-purple-500/30 bg-purple-500/10' : 'border-white/[0.04] bg-black/30 hover:border-white/10 hover:bg-white/[0.02]'
                      }`}
                      onClick={() => hasOptions && setExpandedSocket(isOpen ? null : sock.socketIndex)}
                      data-testid={`subclass-socket-${sock.socketIndex}`}
                    >
                      {sock.icon && <img src={sock.icon} alt={sock.name} className="w-8 h-8 rounded-sm ring-1 ring-white/10 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold truncate tracking-wider text-white/90">{sock.name}</p>
                        {sock.description && cat.group !== 'fragment' && (
                          <p className="text-[8px] text-gray-500 truncate mt-0.5">{sock.description}</p>
                        )}
                      </div>
                      {hasOptions && (
                        <div className="text-gray-600 shrink-0">
                          {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        </div>
                      )}
                    </div>

                    <AnimatePresence>
                      {isOpen && hasOptions && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="border-x border-b border-purple-500/15 bg-black/40 max-h-[200px] overflow-y-auto">
                            {sock.reusablePlugs
                              .filter(rp => rp.plugHash !== sock.plugHash)
                              .map((rp) => (
                                <div
                                  key={rp.plugHash}
                                  className="flex items-center gap-2 p-2 hover:bg-purple-500/10 cursor-pointer transition-all border-b border-white/[0.03] last:border-0"
                                  onClick={() => handleSwapPlug(sock.socketIndex, rp.plugHash, rp.name)}
                                  data-testid={`plug-option-${rp.plugHash}`}
                                >
                                  {rp.icon && <img src={rp.icon} alt={rp.name} className="w-7 h-7 rounded-sm ring-1 ring-white/10 shrink-0" />}
                                  <div className="flex-1 min-w-0">
                                    <p className="text-[9px] font-bold truncate text-white/80">{rp.name}</p>
                                    {rp.description && (
                                      <p className="text-[8px] text-gray-500 truncate">{rp.description}</p>
                                    )}
                                  </div>
                                  <span className="text-[8px] text-purple-400 uppercase tracking-wider shrink-0">
                                    {insertPlug.isPending ? t('subclass.swapping') : t('subclass.swap')}
                                  </span>
                                </div>
                              ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
