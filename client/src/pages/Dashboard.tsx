import React, { useState, useEffect } from 'react';
import { 
  Settings, Share2, Search, Backpack, Crosshair, 
  Zap, Flame, Hexagon, Shield, Save, Copy, Check, Archive,
  Sparkles, Activity, Loader2, AlertTriangle, RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useBungieAuth } from '@/hooks/use-bungie-auth';
import { useLoadouts, useSaveLoadout } from '@/hooks/use-loadouts';
import { useInventory } from '@/hooks/use-inventory';

import { DesktopNavButton, MobileNavButton, UserProfile } from '@/components/Navigation';
import { ItemCard, EquippedSlot, type Item, type SlotInfo } from '@/components/Inventory';
import { SaveLoadoutModal } from '@/components/SaveLoadoutModal';
import { useToast } from '@/hooks/use-toast';
import { api, buildUrl } from '@shared/routes';

const ITEM_SLOTS: SlotInfo[] = [
  { id: 'kinetic', label: 'Kinetik', icon: Crosshair },
  { id: 'energy', label: 'Energie', icon: Zap },
  { id: 'power', label: 'Power', icon: Flame },
  { id: 'helmet', label: 'Helm', icon: Shield },
  { id: 'arms', label: 'Arme', icon: Shield },
  { id: 'chest', label: 'Brust', icon: Shield },
  { id: 'legs', label: 'Beine', icon: Shield },
  { id: 'class', label: 'Klasse', icon: Hexagon },
];

export default function Dashboard() {
  const { destinyProfile, logout } = useBungieAuth();
  const { 
    data: inventory = [], 
    isLoading: isLoadingInventory, 
    error: inventoryError,
    refetch: refetchInventory
  } = useInventory(destinyProfile?.membershipType, destinyProfile?.membershipId);
  const { data: savedLoadouts = [], isLoading: isLoadingLoadouts } = useLoadouts(destinyProfile?.membershipId);
  const saveLoadoutMutation = useSaveLoadout();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'inventory' | 'saved'>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadout, setLoadout] = useState<Record<string, Item>>({});
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);

  const equipItem = (item: Item) => {
    setLoadout(prev => {
      const newLoadout = { ...prev };
      if (item.rarity === 'exotic') {
        const isWeapon = ['kinetic', 'energy', 'power'].includes(item.slot);
        Object.values(newLoadout).forEach(equippedItem => {
          if (equippedItem.rarity === 'exotic') {
            const equippedIsWeapon = ['kinetic', 'energy', 'power'].includes(equippedItem.slot);
            if (isWeapon === equippedIsWeapon) {
              delete newLoadout[equippedItem.slot];
            }
          }
        });
      }
      newLoadout[item.slot] = item;
      return newLoadout;
    });
    toast({
      title: "Gegenstand angelegt",
      description: `${item.name} wurde zum Loadout hinzugefügt.`,
      duration: 2000,
    });
  };

  const unequipItem = (slotId: string) => {
    setLoadout(prev => {
      const newLoadout = { ...prev };
      delete newLoadout[slotId];
      return newLoadout;
    });
  };

  const handleSaveLoadout = async (name: string) => {
    if (!destinyProfile?.membershipId) return;
    
    const shareCode = Math.random().toString(36).substring(2, 10);
    
    await saveLoadoutMutation.mutateAsync({
      bungieMembershipId: destinyProfile.membershipId,
      name,
      items: loadout,
      shareCode
    });
    
    toast({
      title: "Loadout gespeichert",
      description: `"${name}" erfolgreich gespeichert.`,
    });
    setActiveTab('saved');
  };

  const copyToClipboard = (code: string) => {
    const link = `${window.location.origin}/share/${code}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      toast({ title: "Link kopiert!" });
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const filteredInventory = inventory.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen bg-[#050507] text-gray-300 font-sans selection:bg-indigo-500/30 flex flex-col md:flex-row overflow-hidden relative">
      {/* Global animated background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-[0.03]" />
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#522F65]/10 blur-[120px] rounded-full" />
      </div>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0A0A0C]/80 backdrop-blur-xl border-r border-white/5 shrink-0 z-20 shadow-2xl relative">
        <div className="p-6 pb-2">
          <div className="flex items-center space-x-3 mb-8">
             <Hexagon className="w-8 h-8 text-white shadow-[0_0_20px_rgba(255,255,255,0.2)]" strokeWidth={1.5} />
            <span className="font-display font-light text-xl tracking-[0.3em] text-white">FORGE</span>
          </div>
        </div>

        <nav className="flex-1 py-4 flex flex-col space-y-2 px-3">
          <DesktopNavButton 
            icon={Backpack} 
            label="INVENTAR" 
            active={activeTab === 'inventory'} 
            onClick={() => setActiveTab('inventory')} 
          />
          <DesktopNavButton 
            icon={Archive} 
            label="GESPEICHERT" 
            active={activeTab === 'saved'} 
            onClick={() => setActiveTab('saved')} 
          />
        </nav>

        <UserProfile profile={destinyProfile} onLogout={logout} />
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden z-10">
        <header className="h-20 border-b border-white/5 bg-[#050507]/60 backdrop-blur-xl flex items-center justify-between px-8 shrink-0 z-10">
          <div className="flex items-center space-x-4">
            <Activity className="w-5 h-5 text-indigo-400 opacity-70" />
            <h2 className="font-display font-light text-sm tracking-[0.2em] text-white/90 uppercase">
              {activeTab === 'inventory' ? 'Ausrüstungs-Zentrum' : 'Konfigurationen'}
            </h2>
          </div>
          
          <div className="flex items-center space-x-4">
             <div className="text-[10px] text-gray-500 font-mono tracking-widest hidden lg:block">STATUS: ONLINE</div>
            <button className="p-2.5 text-gray-500 hover:text-white transition-all bg-white/5 rounded-full hover:bg-white/10">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {activeTab === 'inventory' && (
              <motion.div 
                key="inventory"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col lg:flex-row"
              >
                {/* Left Panel: Inventory Vault */}
                <div className="flex-1 flex flex-col min-w-0 border-r border-white/5 min-h-0 overflow-hidden">
                  <div className="p-4 md:p-8 pb-2 md:pb-4 shrink-0">
                    <div className="relative group">
                      <Search className="absolute left-4 md:left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                      <input 
                        type="text" 
                        placeholder="Tresor durchsuchen..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#0A0A0C]/60 border border-white/10 text-white pl-10 md:pl-12 pr-4 md:pr-6 py-3 md:py-4 text-sm focus:outline-none focus:border-indigo-500/50 transition-all font-light tracking-wider destiny-clip-sm"
                      />
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-2">
                    {isLoadingInventory ? (
                      <div className="flex flex-col items-center justify-center h-64 space-y-4">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                        <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] font-display">
                          Lade Inventar von Bungie...
                        </p>
                      </div>
                    ) : inventoryError ? (
                      <div className="flex flex-col items-center justify-center h-64 space-y-4">
                        <AlertTriangle className="w-8 h-8 text-amber-500" />
                        <p className="text-sm text-gray-400 text-center max-w-md">
                          Inventar konnte nicht geladen werden. Bitte melde dich erneut an.
                        </p>
                        <button 
                          onClick={() => refetchInventory()}
                          className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all destiny-clip-sm"
                          data-testid="button-retry-inventory"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Erneut versuchen
                        </button>
                      </div>
                    ) : filteredInventory.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 space-y-4">
                        <Search className="w-8 h-8 text-gray-600" />
                        <p className="text-sm text-gray-500">
                          {searchQuery ? 'Keine Gegenstände gefunden.' : 'Kein Inventar verfügbar.'}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-2 md:gap-4">
                        {filteredInventory.map(item => (
                          <ItemCard 
                            key={item.id} 
                            item={item} 
                            isEquipped={loadout[item.slot]?.id === item.id}
                            onClick={() => equipItem(item)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Panel: Active Loadout */}
                <div className="w-full lg:w-[400px] bg-[#0A0A0C]/40 backdrop-blur-sm flex flex-col shrink-0 relative overflow-hidden">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[60px] pointer-events-none" />
                  
                  <div className="p-8 border-b border-white/5 flex items-center justify-between">
                    <div>
                      <h3 className="text-white font-display font-light tracking-[0.2em] flex items-center gap-3 text-sm">
                        <Sparkles className="w-4 h-4 text-[#E5C76B]" />
                        AKTIVES LOADOUT
                      </h3>
                    </div>
                    
                    <button 
                      onClick={() => setIsSaveModalOpen(true)}
                      disabled={Object.keys(loadout).length === 0}
                      className="px-6 py-2.5 bg-white/5 hover:bg-white text-white hover:text-black transition-all duration-500 disabled:opacity-20 border border-white/10 hover:border-white text-[10px] font-bold tracking-[0.2em] destiny-clip-sm"
                    >
                      SPEICHERN
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-8 space-y-4">
                    {ITEM_SLOTS.map(slot => (
                      <EquippedSlot 
                        key={slot.id} 
                        slotInfo={slot} 
                        item={loadout[slot.id]} 
                        onUnequip={() => unequipItem(slot.id)}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'saved' && (
              <motion.div 
                key="saved"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full p-6 md:p-10 overflow-y-auto"
              >
                {isLoadingLoadouts ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                  </div>
                ) : savedLoadouts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500 space-y-6">
                    <Archive className="w-16 h-16 opacity-10" />
                    <p className="font-display tracking-[0.3em] uppercase text-xs">Keine Daten gefunden</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {savedLoadouts.map((saved) => (
                      <div key={saved.id} className="bg-[#0A0A0C]/80 border border-white/10 p-6 group destiny-clip-sm hover:border-white/30 transition-all duration-500">
                        <div className="flex justify-between items-start mb-8">
                          <div>
                            <h3 className="text-white font-display text-lg font-light tracking-wider">{saved.name}</h3>
                            <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-2 font-mono">
                              {new Date(saved.createdAt!).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex space-x-2">
                             {saved.shareCode && (
                               <button 
                                onClick={() => copyToClipboard(saved.shareCode!)}
                                className="w-10 h-10 bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-all destiny-clip-sm border border-white/5"
                              >
                                <Share2 className="w-4 h-4" />
                              </button>
                             )}
                            <button 
                              onClick={() => {
                                setLoadout(saved.items as Record<string, Item>);
                                setActiveTab('inventory');
                              }}
                              className="w-10 h-10 bg-indigo-500/20 flex items-center justify-center text-indigo-400 hover:bg-white hover:text-black transition-all destiny-clip-sm border border-indigo-500/20"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-8 gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                          {Object.values(saved.items as Record<string, Item>).map((item: any, i) => (
                            <div key={i} className="aspect-square border border-white/10 bg-black relative overflow-hidden destiny-clip-sm">
                              <img src={item.icon} alt={item.name} className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <nav className="md:hidden flex items-center justify-around bg-[#0A0A0C] border-t border-white/5 py-4 px-6 z-20">
        <MobileNavButton 
          icon={Backpack} 
          label="INVENTAR" 
          active={activeTab === 'inventory'} 
          onClick={() => setActiveTab('inventory')} 
        />
        <MobileNavButton 
          icon={Archive} 
          label="LOADOUTS" 
          active={activeTab === 'saved'} 
          onClick={() => setActiveTab('saved')} 
        />
      </nav>

      <SaveLoadoutModal 
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSave={handleSaveLoadout}
      />
    </div>
  );
}
