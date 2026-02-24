import { useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { api, buildUrl } from '@shared/routes';
import { Loader2, ArrowLeft, Hexagon, Sparkles, Check, AlertTriangle, X } from 'lucide-react';
import { EquippedSlot, type Item } from '@/components/Inventory';
import { SavedLoadout } from '@shared/schema';
import { useBungieAuth } from '@/hooks/use-bungie-auth';
import { useInventory } from '@/hooks/use-inventory';
import { motion, AnimatePresence } from 'framer-motion';

const ITEM_SLOTS = [
  { id: 'kinetic', label: 'Kinetik', icon: () => null },
  { id: 'energy', label: 'Energie', icon: () => null },
  { id: 'power', label: 'Power', icon: () => null },
  { id: 'helmet', label: 'Helm', icon: () => null },
  { id: 'arms', label: 'Arme', icon: () => null },
  { id: 'chest', label: 'Brust', icon: () => null },
  { id: 'legs', label: 'Beine', icon: () => null },
  { id: 'class', label: 'Klasse', icon: () => null },
];

interface MatchResult {
  slot: string;
  wanted: Item | null;
  matched: Item | null;
  status: 'exact' | 'substitute' | 'missing';
  note?: string;
}

function matchLoadoutToInventory(loadoutItems: Record<string, Item>, inventory: Item[]): MatchResult[] {
  const results: MatchResult[] = [];

  for (const slot of ITEM_SLOTS) {
    const wanted = loadoutItems[slot.id] as Item | undefined;
    if (!wanted) {
      results.push({ slot: slot.id, wanted: null, matched: null, status: 'exact' });
      continue;
    }

    const exactMatch = inventory.find(i => i.name === wanted.name && i.slot === wanted.slot);
    if (exactMatch) {
      results.push({ slot: slot.id, wanted, matched: exactMatch, status: 'exact' });
      continue;
    }

    const slotItems = inventory.filter(i => i.slot === wanted.slot);
    const sameRarity = slotItems.filter(i => i.rarity === wanted.rarity);
    const bestMatch = (sameRarity.length > 0 ? sameRarity : slotItems).sort((a, b) => b.power - a.power)[0];

    if (bestMatch) {
      results.push({
        slot: slot.id,
        wanted,
        matched: bestMatch,
        status: 'substitute',
        note: `"${wanted.name}" nicht vorhanden. "${bestMatch.name}" als Ersatz gewählt.`,
      });
    } else {
      results.push({
        slot: slot.id,
        wanted,
        matched: null,
        status: 'missing',
        note: `"${wanted.name}" nicht im Inventar gefunden.`,
      });
    }
  }

  return results;
}

export default function SharePage() {
  const [, params] = useRoute('/share/:shareCode');
  const [, setLocation] = useLocation();
  const shareCode = params?.shareCode;
  const { isAuthenticated, destinyProfile, login } = useBungieAuth();
  const { data: inventory = [] } = useInventory(destinyProfile?.membershipType, destinyProfile?.membershipId);
  const [showAdoptModal, setShowAdoptModal] = useState(false);

  const { data: loadout, isLoading, error } = useQuery<SavedLoadout>({
    queryKey: [buildUrl(api.loadouts.getByShareCode.path, { shareCode: shareCode! })],
    enabled: !!shareCode,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050507] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !loadout) {
    return (
      <div className="min-h-screen bg-[#050507] flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-display font-light text-white mb-4 tracking-widest">LOADOUT NICHT GEFUNDEN</h1>
        <button onClick={() => setLocation('/')} className="text-indigo-400 hover:text-indigo-300 flex items-center gap-2 uppercase tracking-widest text-xs">
          <ArrowLeft className="w-4 h-4" /> Zurück zum Orbit
        </button>
      </div>
    );
  }

  const loadoutItems = loadout.items as Record<string, Item>;
  const matchResults = isAuthenticated && inventory.length > 0 ? matchLoadoutToInventory(loadoutItems, inventory) : null;

  return (
    <div className="min-h-screen bg-[#050507] text-gray-300 p-4 md:p-6 flex flex-col items-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(40,40,60,0.3)_0%,_rgba(5,5,7,1)_100%)] z-0" />
      
      <div className="max-w-2xl w-full z-10 space-y-6">
        <div className="text-center space-y-4 pt-4">
          <Hexagon className="w-10 h-10 mx-auto text-white opacity-80" strokeWidth={1} />
          <h1 className="text-2xl md:text-3xl font-display font-light text-white tracking-[0.3em] uppercase" data-testid="text-loadout-name">{loadout.name}</h1>
          <p className="text-[10px] text-indigo-400 tracking-[0.3em] font-mono uppercase opacity-70">Geteilte Konfiguration</p>
        </div>

        <div className="bg-[#0A0A0C]/60 backdrop-blur-xl border border-white/10 p-5 md:p-8 destiny-clip-sm space-y-4 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-4 h-4 text-[#E5C76B]" />
            <h3 className="text-xs font-display font-light tracking-[0.2em] text-white">AUSRÜSTUNG</h3>
          </div>
          
          <div className="grid gap-3">
            {ITEM_SLOTS.map(slot => (
              <div key={slot.id} className="opacity-90">
                <EquippedSlot 
                  slotInfo={{ ...slot, icon: () => null } as any} 
                  item={loadoutItems[slot.id]} 
                  onUnequip={() => {}} 
                />
              </div>
            ))}
          </div>
        </div>

        {isAuthenticated ? (
          <button 
            onClick={() => setShowAdoptModal(true)}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white transition-all destiny-clip-sm text-[10px] tracking-[0.3em] font-bold uppercase"
            data-testid="button-adopt-loadout"
          >
            LOADOUT ÜBERNEHMEN
          </button>
        ) : (
          <div className="space-y-3">
            <button 
              onClick={login}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white transition-all destiny-clip-sm text-[10px] tracking-[0.3em] font-bold uppercase"
            >
              ANMELDEN UM LOADOUT ZU ÜBERNEHMEN
            </button>
            <button 
              onClick={() => setLocation('/')}
              className="w-full py-4 bg-white/5 border border-white/10 hover:border-white/40 text-white transition-all destiny-clip-sm text-[10px] tracking-[0.3em] font-bold uppercase"
            >
              EIGENES LOADOUT ERSTELLEN
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAdoptModal && matchResults && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowAdoptModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#141417] border border-white/10 p-6 w-full max-w-lg shadow-2xl max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-display font-light text-white tracking-wider">Loadout übernehmen</h2>
                <button onClick={() => setShowAdoptModal(false)} className="text-gray-500 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 mb-6">
                {matchResults.filter(r => r.wanted).map(result => (
                  <div key={result.slot} className={`flex items-center gap-3 p-3 border ${
                    result.status === 'exact' ? 'border-green-500/20 bg-green-500/5' :
                    result.status === 'substitute' ? 'border-amber-500/20 bg-amber-500/5' :
                    'border-red-500/20 bg-red-500/5'
                  }`}>
                    <div className="w-8 h-8 shrink-0 border border-white/10 overflow-hidden bg-black">
                      {(result.matched || result.wanted) && (
                        <img src={(result.matched || result.wanted)!.icon} alt="" className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      {result.status === 'exact' && (
                        <p className="text-[10px] text-green-400 flex items-center gap-1">
                          <Check className="w-3 h-3" /> {result.wanted!.name}
                        </p>
                      )}
                      {result.status === 'substitute' && (
                        <div>
                          <p className="text-[10px] text-amber-400 font-bold truncate">{result.matched!.name}</p>
                          <p className="text-[9px] text-amber-400/70">{result.note}</p>
                        </div>
                      )}
                      {result.status === 'missing' && (
                        <div>
                          <p className="text-[10px] text-red-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> {result.note}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {matchResults.some(r => r.status === 'substitute' || r.status === 'missing') && (
                <p className="text-[10px] text-gray-500 mb-4">
                  Einige Gegenstände konnten nicht exakt zugeordnet werden. Die bestmögliche Alternative wurde gewählt.
                </p>
              )}

              <div className="flex gap-3">
                <button onClick={() => setShowAdoptModal(false)}
                  className="flex-1 py-3 bg-white/5 border border-white/10 text-white text-[10px] tracking-[0.2em] uppercase font-bold hover:bg-white/10 transition-all">
                  Abbrechen
                </button>
                <button onClick={() => {
                  const adoptedLoadout: Record<string, Item> = {};
                  matchResults.forEach(r => {
                    if (r.matched) adoptedLoadout[r.slot] = r.matched;
                  });
                  localStorage.setItem('pending_loadout', JSON.stringify(adoptedLoadout));
                  setLocation('/dashboard');
                }}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] tracking-[0.2em] uppercase font-bold transition-all"
                  data-testid="button-confirm-adopt">
                  Übernehmen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
