import React, { useState } from 'react';
import { 
  Settings, Share2, Search, Backpack, Crosshair, 
  Zap, Flame, Hexagon, Shield, Save, Copy, Check, Archive
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useBungieAuth } from '@/hooks/use-bungie-auth';
import { useLoadouts, useSaveLoadout } from '@/hooks/use-loadouts';

import { DesktopNavButton, MobileNavButton, UserProfile } from '@/components/Navigation';
import { ItemCard, EquippedSlot, type Item, type SlotInfo } from '@/components/Inventory';
import { SaveLoadoutModal } from '@/components/SaveLoadoutModal';
import { useToast } from '@/hooks/use-toast';

// --- MOCK DATA ---
const mockInventory: Item[] = [
  { id: '1', name: 'Fatebringer', type: 'Hand Cannon', slot: 'kinetic', rarity: 'legendary', power: 1810, icon: 'https://www.bungie.net/common/destiny2_content/icons/12e2e92c57ba8b9cc67776156e5df4e2.jpg' },
  { id: '2', name: 'Gjallarhorn', type: 'Rocket Launcher', slot: 'power', rarity: 'exotic', power: 1810, icon: 'https://www.bungie.net/common/destiny2_content/icons/5cbcd5970c6dfcb208b534608c0f5f8b.jpg' },
  { id: '3', name: 'The Recluse', type: 'Submachine Gun', slot: 'energy', rarity: 'legendary', power: 1805, icon: 'https://www.bungie.net/common/destiny2_content/icons/5a0c10816997cbda306db09b93b80e81.jpg' },
  { id: '4', name: 'Wormgod Caress', type: 'Gauntlets', slot: 'arms', rarity: 'exotic', power: 1810, icon: 'https://www.bungie.net/common/destiny2_content/icons/80e927c3f0b2f15591fc09520e791b72.jpg' },
  { id: '5', name: 'Witherhoard', type: 'Grenade Launcher', slot: 'kinetic', rarity: 'exotic', power: 1810, icon: 'https://www.bungie.net/common/destiny2_content/icons/185790aeb3ba82ba63f019f71c4c1a5d.jpg' },
  { id: '6', name: 'Igneous Hammer', type: 'Hand Cannon', slot: 'energy', rarity: 'legendary', power: 1810, icon: 'https://www.bungie.net/common/destiny2_content/icons/7cb2c04ff2b9c716f9f5926ec3f9a72d.jpg' },
];

const ITEM_SLOTS: SlotInfo[] = [
  { id: 'kinetic', label: 'Kinetic', icon: Crosshair },
  { id: 'energy', label: 'Energy', icon: Zap },
  { id: 'power', label: 'Power', icon: Flame },
  { id: 'helmet', label: 'Helmet', icon: Shield },
  { id: 'arms', label: 'Arms', icon: Shield },
  { id: 'chest', label: 'Chest', icon: Shield },
  { id: 'legs', label: 'Legs', icon: Shield },
  { id: 'class', label: 'Class', icon: Hexagon },
];

export default function Dashboard() {
  const { destinyProfile, logout } = useBungieAuth();
  const { data: savedLoadouts = [], isLoading: isLoadingLoadouts } = useLoadouts(destinyProfile?.membershipId);
  const saveLoadoutMutation = useSaveLoadout();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<'inventory' | 'saved'>('inventory');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadout, setLoadout] = useState<Record<string, Item>>({});
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  const equipItem = (item: Item) => {
    setLoadout(prev => ({ ...prev, [item.slot]: item }));
    toast({
      title: "Item Equipped",
      description: `${item.name} moved to active loadout.`,
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
    
    await saveLoadoutMutation.mutateAsync({
      bungieMembershipId: destinyProfile.membershipId,
      name,
      items: loadout
    });
    
    toast({
      title: "Loadout Saved",
      description: `Successfully saved "${name}"`,
    });
    setActiveTab('saved');
  };

  const loadSavedLoadout = (savedItems: Record<string, any>) => {
    setLoadout(savedItems as Record<string, Item>);
    setActiveTab('inventory');
    toast({
      title: "Loadout Applied",
      description: "Gear configuration updated.",
    });
  };

  const filteredInventory = mockInventory.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-screen bg-[#0B0B0C] flex flex-col md:flex-row overflow-hidden font-sans text-gray-300">
      
      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-[#101012] border-r border-white/5 shrink-0 z-20 shadow-2xl relative">
        <div className="p-6 pb-2">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-8 h-8 bg-white text-black flex items-center justify-center shadow-[0_0_15px_rgba(255,255,255,0.2)]">
              <Shield className="w-5 h-5" strokeWidth={2} />
            </div>
            <span className="font-display font-bold text-xl tracking-[0.2em] text-white">ORBIT</span>
          </div>
        </div>

        <nav className="flex-1 py-4 flex flex-col space-y-1">
          <DesktopNavButton 
            icon={Backpack} 
            label="INVENTORY" 
            active={activeTab === 'inventory'} 
            onClick={() => setActiveTab('inventory')} 
          />
          <DesktopNavButton 
            icon={Archive} 
            label="SAVED LOADOUTS" 
            active={activeTab === 'saved'} 
            onClick={() => setActiveTab('saved')} 
          />
        </nav>

        <UserProfile profile={destinyProfile} onLogout={logout} />
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        {/* Top Header Layer */}
        <header className="h-16 border-b border-white/5 bg-[#101012]/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-10">
          <h2 className="font-display font-medium text-lg tracking-[0.15em] text-white/90">
            {activeTab === 'inventory' ? 'GEAR MANAGEMENT' : 'SAVED CONFIGURATIONS'}
          </h2>
          
          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-500 hover:text-white transition-colors rounded-full hover:bg-white/5">
              <Settings className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <button className="p-2 text-gray-500 hover:text-white transition-colors rounded-full hover:bg-white/5">
              <Share2 className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>
        </header>

        {/* Content Tabs */}
        <div className="flex-1 overflow-hidden relative">
          <AnimatePresence mode="wait">
            {activeTab === 'inventory' && (
              <motion.div 
                key="inventory"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 flex flex-col lg:flex-row"
              >
                {/* Left Panel: Inventory Vault */}
                <div className="flex-1 flex flex-col min-w-0 border-r border-white/5 bg-[#0B0B0C]/50">
                  <div className="p-6 pb-4 shrink-0">
                    <div className="relative group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-white transition-colors" />
                      <input 
                        type="text" 
                        placeholder="Search weapons, armor, perks..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#141417] border border-white/10 text-white pl-11 pr-4 py-3.5 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/10 transition-all font-display tracking-wide"
                      />
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 pt-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 auto-rows-max">
                      {filteredInventory.map(item => (
                        <ItemCard 
                          key={item.id} 
                          item={item} 
                          isEquipped={loadout[item.slot]?.id === item.id}
                          onClick={() => equipItem(item)}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Panel: Active Loadout */}
                <div className="w-full lg:w-96 bg-[#101012] flex flex-col shrink-0 border-t lg:border-t-0 border-white/5 shadow-[-20px_0_30px_rgba(0,0,0,0.5)] z-10 relative">
                  <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-b from-[#141417] to-transparent">
                    <div>
                      <h3 className="text-white font-display font-medium tracking-[0.15em] flex items-center gap-2">
                        <Crosshair className="w-4 h-4 opacity-70" />
                        ACTIVE LOADOUT
                      </h3>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Light Level: <span className="text-yellow-400 font-bold">1810</span></p>
                    </div>
                    
                    <button 
                      onClick={() => setIsSaveModalOpen(true)}
                      disabled={Object.keys(loadout).length === 0}
                      className="px-4 py-2 bg-white/10 hover:bg-white text-white hover:text-black transition-all duration-300 disabled:opacity-30 disabled:hover:bg-white/10 disabled:hover:text-white flex items-center space-x-2 border border-white/20 hover:border-white text-xs font-display font-bold tracking-widest"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>SAVE</span>
                    </button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-6 space-y-3">
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
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 p-8 overflow-y-auto"
              >
                {isLoadingLoadouts ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  </div>
                ) : savedLoadouts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500 space-y-4">
                    <Archive className="w-12 h-12 opacity-20" />
                    <p className="font-display tracking-widest uppercase">No saved loadouts found</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {savedLoadouts.map((saved) => {
                      const itemCount = Object.keys(saved.items).length;
                      return (
                        <div key={saved.id} className="bg-[#141417] border border-white/10 hover:border-white/30 transition-all p-5 group shadow-lg">
                          <div className="flex justify-between items-start mb-6">
                            <div>
                              <h3 className="text-white font-display text-lg font-medium tracking-wide">{saved.name}</h3>
                              <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">
                                {new Date(saved.createdAt!).toLocaleDateString()}
                              </p>
                            </div>
                            <button 
                              onClick={() => loadSavedLoadout(saved.items)}
                              className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white hover:text-black transition-all shadow-md group-hover:shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                              title="Equip Loadout"
                            >
                              <Check className="w-5 h-5" />
                            </button>
                          </div>
                          
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] text-gray-400 font-display uppercase tracking-widest">Contents</span>
                            <div className="h-px bg-white/10 flex-1"></div>
                            <span className="text-[10px] text-white/50">{itemCount} Items</span>
                          </div>
                          
                          <div className="flex -space-x-2 overflow-hidden py-2">
                            {Object.values(saved.items).slice(0, 5).map((item: any, i) => (
                              <div key={i} className="w-10 h-10 rounded-sm border border-white/20 bg-black shrink-0 relative overflow-hidden">
                                <img src={item.icon} alt={item.name} className="w-full h-full object-cover" />
                                <div className="absolute top-0 w-full h-0.5" style={{ backgroundColor: item.rarity === 'exotic' ? '#E5C76B' : '#7D5C96' }} />
                              </div>
                            ))}
                            {itemCount > 5 && (
                              <div className="w-10 h-10 rounded-sm border border-white/20 bg-[#1A1A1E] shrink-0 flex items-center justify-center text-xs font-medium z-10 text-white/70">
                                +{itemCount - 5}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="md:hidden flex items-center justify-around bg-[#101012] border-t border-white/5 py-2 px-4 shrink-0 z-20 pb-safe">
        <MobileNavButton 
          icon={Backpack} 
          label="INVENTORY" 
          active={activeTab === 'inventory'} 
          onClick={() => setActiveTab('inventory')} 
        />
        <div className="w-px h-8 bg-white/10" />
        <MobileNavButton 
          icon={Archive} 
          label="LOADOUTS" 
          active={activeTab === 'saved'} 
          onClick={() => setActiveTab('saved')} 
        />
      </nav>

      {/* SAVE MODAL */}
      <SaveLoadoutModal 
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSave={handleSaveLoadout}
      />
    </div>
  );
}
