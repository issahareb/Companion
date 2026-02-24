import React from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { api, buildUrl } from '@shared/routes';
import { Loader2, ArrowLeft, Hexagon, Sparkles } from 'lucide-react';
import { EquippedSlot, type Item } from '@/components/Inventory';

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

export default function SharePage() {
  const [, params] = useRoute('/share/:shareCode');
  const [, setLocation] = useLocation();
  const shareCode = params?.shareCode;

  const { data: loadout, isLoading, error } = useQuery({
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
        <button 
          onClick={() => setLocation('/')}
          className="text-indigo-400 hover:text-indigo-300 flex items-center gap-2 uppercase tracking-widest text-xs"
        >
          <ArrowLeft className="w-4 h-4" /> Zurück zum Orbit
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050507] text-gray-300 p-6 flex flex-col items-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(40,40,60,0.3)_0%,_rgba(5,5,7,1)_100%)] z-0" />
      
      <div className="max-w-2xl w-full z-10 space-y-8">
        <div className="text-center space-y-4">
           <Hexagon className="w-12 h-12 mx-auto text-white opacity-80" strokeWidth={1} />
          <h1 className="text-3xl font-display font-light text-white tracking-[0.3em] uppercase">{loadout.name}</h1>
          <p className="text-[10px] text-indigo-400 tracking-[0.3em] font-mono uppercase opacity-70">Geteilte Konfiguration</p>
        </div>

        <div className="bg-[#0A0A0C]/60 backdrop-blur-xl border border-white/10 p-8 destiny-clip-sm space-y-4 shadow-2xl">
          <div className="flex items-center gap-3 mb-6">
            <Sparkles className="w-4 h-4 text-[#E5C76B]" />
            <h3 className="text-xs font-display font-light tracking-[0.2em] text-white">AUSRÜSTUNG</h3>
          </div>
          
          <div className="grid gap-3">
            {ITEM_SLOTS.map(slot => (
               <div key={slot.id} className="opacity-90 grayscale-[20%]">
                <EquippedSlot 
                  slotInfo={{ ...slot, icon: () => null } as any} 
                  item={(loadout.items as any)[slot.id]} 
                  onUnequip={() => {}} 
                />
              </div>
            ))}
          </div>
        </div>

        <button 
          onClick={() => setLocation('/')}
          className="w-full py-4 bg-white/5 border border-white/10 hover:border-white/40 text-white transition-all destiny-clip-sm text-[10px] tracking-[0.3em] font-bold uppercase"
        >
          EIGENES LOADOUT ERSTELLEN
        </button>
      </div>
    </div>
  );
}
