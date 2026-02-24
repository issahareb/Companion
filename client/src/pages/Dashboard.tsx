import { useState, useEffect, useMemo } from 'react';
import { 
  Settings, Share2, Search, Crosshair, 
  Zap, Flame, Hexagon, Shield, Check, Archive,
  Sparkles, Activity, Loader2, AlertTriangle, RefreshCw,
  Users, ArrowRightLeft, Trash2, X, Package, Mail,
  ChevronDown, ChevronUp, Filter, SlidersHorizontal, Coins,
  Plus, Sword, ShieldHalf, Orbit, Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import { useBungieAuth } from '@/hooks/use-bungie-auth';
import { useLoadouts, useSaveLoadout, useDeleteLoadout } from '@/hooks/use-loadouts';
import { useProfileState, type InventoryItem, type CharacterData, type CurrencyInfo, type QuestItem } from '@/hooks/use-profile-state';
import { useTransferItem, useEquipItem, useSwapItem } from '@/hooks/use-transfer';

import { DesktopNavButton, MobileNavButton, UserProfile } from '@/components/Navigation';
import { ItemCard, EquippedSlot, type Item, type SlotInfo } from '@/components/Inventory';
import { SaveLoadoutModal } from '@/components/SaveLoadoutModal';
import { useToast } from '@/hooks/use-toast';

const ITEM_SLOTS: SlotInfo[] = [
  { id: 'kinetic', label: 'Primär', icon: Crosshair },
  { id: 'energy', label: 'Energie', icon: Zap },
  { id: 'power', label: 'Schwer', icon: Flame },
  { id: 'helmet', label: 'Kopf', icon: Shield },
  { id: 'arms', label: 'Arme', icon: Shield },
  { id: 'chest', label: 'Brust', icon: Shield },
  { id: 'legs', label: 'Beine', icon: Shield },
  { id: 'class', label: 'Klasse', icon: Hexagon },
  { id: 'subclass', label: 'Subklasse', icon: Orbit },
];

type TabType = 'characters' | 'vault' | 'loadouts' | 'postmaster';

const SLOT_FILTERS = [
  { id: 'all', label: 'Alle' },
  { id: 'kinetic', label: 'Primär' },
  { id: 'energy', label: 'Energie' },
  { id: 'power', label: 'Schwer' },
  { id: 'helmet', label: 'Kopf' },
  { id: 'arms', label: 'Arme' },
  { id: 'chest', label: 'Brust' },
  { id: 'legs', label: 'Beine' },
  { id: 'class', label: 'Klasse' },
  { id: 'subclass', label: 'Subklasse' },
];

const RARITY_FILTERS = [
  { id: 'all', label: 'Alle' },
  { id: 'exotic', label: 'Exotisch' },
  { id: 'legendary', label: 'Legendär' },
  { id: 'rare', label: 'Selten' },
];

function toItem(inv: InventoryItem): Item {
  return {
    id: inv.id,
    itemHash: inv.itemHash,
    name: inv.name,
    type: inv.type,
    slot: inv.slot,
    screenshot: inv.screenshot,
    rarity: (inv.rarity === 'exotic' || inv.rarity === 'legendary') ? inv.rarity : 'legendary',
    power: inv.power,
    icon: inv.icon,
  };
}

interface FilterState {
  search: string;
  slot: string;
  rarity: string;
  minPower: string;
  maxPower: string;
}

function useItemFilter(items: InventoryItem[], filters: FilterState): InventoryItem[] {
  return useMemo(() => {
    return items.filter(item => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!item.name.toLowerCase().includes(q) && !item.type.toLowerCase().includes(q)) return false;
      }
      if (filters.slot !== 'all' && item.slot !== filters.slot) return false;
      if (filters.rarity !== 'all' && item.rarity !== filters.rarity) return false;
      if (filters.minPower && item.power < parseInt(filters.minPower)) return false;
      if (filters.maxPower && item.power > parseInt(filters.maxPower)) return false;
      return true;
    });
  }, [items, filters]);
}

export default function Dashboard() {
  const { destinyProfile, logout } = useBungieAuth();
  const { 
    data: profileState, 
    isLoading: isLoadingProfile, 
    error: profileError,
    refetch: refetchProfile
  } = useProfileState(destinyProfile?.membershipType, destinyProfile?.membershipId);
  const { data: savedLoadouts = [], isLoading: isLoadingLoadouts } = useLoadouts(destinyProfile?.membershipId);
  const saveLoadoutMutation = useSaveLoadout();
  const deleteLoadoutMutation = useDeleteLoadout();
  const transferMutation = useTransferItem();
  const equipMutation = useEquipItem();
  const swapMutation = useSwapItem();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>('characters');
  const [loadout, setLoadout] = useState<Record<string, Item>>({});
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [showMobileLoadout, setShowMobileLoadout] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [vaultFilters, setVaultFilters] = useState<FilterState>({ search: '', slot: 'all', rarity: 'all', minPower: '', maxPower: '' });
  const [slotPickerSlot, setSlotPickerSlot] = useState<string | null>(null);

  const characters = profileState?.characters || [];
  const vaultItems = profileState?.vaultItems || [];
  const postmasterItems = profileState?.postmasterItems || [];
  const currencies = profileState?.currencies || [];

  const selectedCharacter = characters.find(c => c.characterId === selectedCharacterId) || null;

  useEffect(() => {
    if (characters.length > 0 && !selectedCharacterId) {
      setSelectedCharacterId(characters[0].characterId);
    }
  }, [characters, selectedCharacterId]);

  useEffect(() => {
    const pending = localStorage.getItem('pending_loadout');
    if (pending) {
      try {
        setLoadout(JSON.parse(pending));
        toast({ title: "Loadout übernommen", description: "Das geteilte Loadout wurde geladen." });
      } catch {}
      localStorage.removeItem('pending_loadout');
    }
  }, []);

  const filteredVaultItems = useItemFilter(vaultItems, vaultFilters);

  const addToLoadout = (item: Item) => {
    setLoadout(prev => {
      const newLoadout = { ...prev };
      if (item.rarity === 'exotic') {
        const isWeapon = ['kinetic', 'energy', 'power'].includes(item.slot);
        Object.values(newLoadout).forEach(eq => {
          if (eq.rarity === 'exotic') {
            const eqIsWeapon = ['kinetic', 'energy', 'power'].includes(eq.slot);
            if (isWeapon === eqIsWeapon) delete newLoadout[eq.slot];
          }
        });
      }
      newLoadout[item.slot] = item;
      return newLoadout;
    });
    toast({ title: "Hinzugefügt", description: `${item.name} zum Loadout hinzugefügt.`, duration: 2000 });
  };

  const unequipItem = (slotId: string) => {
    setLoadout(prev => { const n = { ...prev }; delete n[slotId]; return n; });
  };

  const handleSaveLoadout = async (name: string) => {
    if (!destinyProfile?.membershipId) return;
    const shareCode = Math.random().toString(36).substring(2, 10);
    await saveLoadoutMutation.mutateAsync({ bungieMembershipId: destinyProfile.membershipId, name, items: loadout as any, shareCode });
    toast({ title: "Loadout gespeichert", description: `"${name}" erfolgreich gespeichert.` });
    setActiveTab('loadouts');
  };

  const handleDeleteLoadout = async (id: number) => {
    if (!destinyProfile?.membershipId) return;
    await deleteLoadoutMutation.mutateAsync({ id, bungieMembershipId: destinyProfile.membershipId });
    toast({ title: "Loadout gelöscht" });
  };

  const handleTransfer = async (item: InventoryItem, toVault: boolean, characterId: string) => {
    if (!destinyProfile) return;
    try {
      await transferMutation.mutateAsync({
        itemReferenceHash: item.itemHash,
        itemId: item.id,
        characterId,
        membershipType: destinyProfile.membershipType,
        transferToVault: toVault,
      });
      toast({ title: "Verschoben", description: `${item.name} wurde ${toVault ? 'in den Tresor' : 'zum Hüter'} verschoben.` });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
  };

  const handleEquip = async (item: InventoryItem, characterId: string) => {
    if (!destinyProfile) return;
    try {
      if (item.location === 'vault') {
        await swapMutation.mutateAsync({
          item: { id: item.id, itemHash: item.itemHash, location: item.location, characterId: item.characterId },
          targetCharacterId: characterId,
          membershipType: destinyProfile.membershipType,
        });
      } else if (item.location === 'character') {
        if (item.characterId !== characterId) {
          await swapMutation.mutateAsync({
            item: { id: item.id, itemHash: item.itemHash, location: item.location, characterId: item.characterId },
            targetCharacterId: characterId,
            membershipType: destinyProfile.membershipType,
          });
        } else {
          await equipMutation.mutateAsync({
            itemId: item.id,
            characterId,
            membershipType: destinyProfile.membershipType,
          });
        }
      }
      toast({ title: "Angelegt", description: `${item.name} wurde angelegt.` });
    } catch (err: any) {
      toast({ title: "Fehler", description: err.message, variant: "destructive" });
    }
  };

  const copyToClipboard = (code: string) => {
    const link = `${window.location.origin}/share/${code}`;
    navigator.clipboard.writeText(link).then(() => {
      toast({ title: "Link kopiert!" });
    });
  };

  const tabTitles: Record<TabType, string> = {
    characters: 'Hüter-Übersicht',
    vault: 'Tresor',
    loadouts: 'Loadouts',
    postmaster: 'Postmeister',
  };

  return (
    <div className="h-screen bg-[#050507] text-gray-300 font-sans selection:bg-indigo-500/30 flex flex-col md:flex-row overflow-hidden relative">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-[0.03]" />
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#522F65]/10 blur-[120px] rounded-full" />
      </div>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-[#0A0A0C]/80 backdrop-blur-xl border-r border-white/5 shrink-0 z-20 shadow-2xl relative">
        <div className="p-6 pb-2">
          <div className="flex items-center space-x-3 mb-6">
            <Hexagon className="w-8 h-8 text-white shadow-[0_0_20px_rgba(255,255,255,0.2)]" strokeWidth={1.5} />
            <span className="font-display font-light text-xl tracking-[0.3em] text-white">FORGE</span>
          </div>
        </div>

        {currencies.length > 0 && (
          <div className="px-4 pb-4 flex flex-wrap gap-2">
            {currencies.slice(0, 4).map(c => (
              <div key={c.itemHash} className="flex items-center gap-1.5 bg-white/5 rounded px-2 py-1" title={c.name}>
                {c.icon && <img src={c.icon} alt="" className="w-4 h-4" />}
                <span className="text-[10px] text-gray-400 font-mono">{c.quantity.toLocaleString('de-DE')}</span>
              </div>
            ))}
          </div>
        )}

        <nav className="flex-1 py-2 flex flex-col space-y-1.5 px-3">
          <DesktopNavButton icon={Users} label="HÜTER" active={activeTab === 'characters'} onClick={() => setActiveTab('characters')} />
          <DesktopNavButton icon={Package} label="TRESOR" active={activeTab === 'vault'} onClick={() => setActiveTab('vault')} />
          <DesktopNavButton icon={Archive} label="LOADOUTS" active={activeTab === 'loadouts'} onClick={() => setActiveTab('loadouts')} />
          <DesktopNavButton icon={Mail} label="POSTMEISTER" active={activeTab === 'postmaster'} onClick={() => setActiveTab('postmaster')} />
        </nav>
        <UserProfile profile={destinyProfile} onLogout={logout} />
      </aside>

      <main className="flex-1 flex flex-col h-full relative overflow-hidden z-10">
        {/* HEADER */}
        <header className="h-14 md:h-16 border-b border-white/5 bg-[#050507]/60 backdrop-blur-xl flex items-center justify-between px-4 md:px-8 shrink-0 z-10">
          <div className="flex items-center space-x-4">
            <Activity className="w-5 h-5 text-indigo-400 opacity-70" />
            <h2 className="font-display font-light text-sm tracking-[0.2em] text-white/90 uppercase" data-testid="text-header-title">
              {tabTitles[activeTab]}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {currencies.length > 0 && (
              <div className="hidden md:flex items-center gap-3">
                {currencies.slice(0, 3).map(c => (
                  <div key={c.itemHash} className="flex items-center gap-1" title={c.name}>
                    {c.icon && <img src={c.icon} alt="" className="w-4 h-4 opacity-70" />}
                    <span className="text-[10px] text-gray-400 font-mono">{c.quantity.toLocaleString('de-DE')}</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => refetchProfile()} className="p-2 text-gray-500 hover:text-white transition-all bg-white/5 rounded-full hover:bg-white/10" data-testid="button-refresh">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-hidden relative">
          {isLoadingProfile ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] font-display">Lade Profildaten von Bungie...</p>
            </div>
          ) : profileError ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
              <p className="text-sm text-gray-400 text-center max-w-md">Profildaten konnten nicht geladen werden.</p>
              <button onClick={() => refetchProfile()} className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all destiny-clip-sm">
                <RefreshCw className="w-3.5 h-3.5" /> Erneut versuchen
              </button>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {/* HÜTER TAB */}
              {activeTab === 'characters' && (
                <motion.div key="characters" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col">
                  {/* Character selector */}
                  <div className="flex items-center gap-2 p-3 md:p-4 border-b border-white/5 shrink-0 overflow-x-auto">
                    {characters.map(char => (
                      <button
                        key={char.characterId}
                        onClick={() => setSelectedCharacterId(char.characterId)}
                        className={`flex items-center gap-2 px-3 py-2 border transition-all shrink-0 destiny-clip-sm ${
                          selectedCharacterId === char.characterId
                            ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/30'
                        }`}
                        data-testid={`button-select-char-${char.characterId}`}
                      >
                        {char.emblemPath && <img src={char.emblemPath} alt="" className="w-8 h-8 border border-white/10" />}
                        <div className="text-left">
                          <p className="text-[10px] font-bold tracking-wider uppercase">{char.className}</p>
                          <p className="text-[9px] text-gray-500 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5 text-[#E5C76B]" /> {char.light}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>

                  {selectedCharacter && (
                    <div className="flex-1 min-h-0 overflow-y-auto">
                      {/* Character header */}
                      <div className="relative">
                        {selectedCharacter.emblemBackgroundPath && (
                          <img src={selectedCharacter.emblemBackgroundPath} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30" />
                        )}
                        <div className="relative z-10 p-4 md:p-6 flex items-center justify-between">
                          <div>
                            <h3 className="text-xl md:text-2xl text-white font-display font-light tracking-wider">{selectedCharacter.className}</h3>
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest">{selectedCharacter.raceName}</p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <Sparkles className="w-5 h-5 text-[#E5C76B]" />
                              <span className="text-3xl font-display font-light text-white" data-testid="text-power-level">{selectedCharacter.light}</span>
                            </div>
                            <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Power Level</p>
                          </div>
                        </div>
                      </div>

                      {/* Stats */}
                      {Object.keys(selectedCharacter.stats).length > 0 && (
                        <div className="px-4 md:px-6 pb-4">
                          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                            {Object.entries(selectedCharacter.stats).map(([name, val]) => (
                              <div key={name} className="bg-white/5 border border-white/5 p-2 text-center">
                                <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-1">{name}</p>
                                <p className="text-sm font-display text-white font-light" data-testid={`text-stat-${name.toLowerCase()}`}>{val}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* WAFFEN Section */}
                      <div className="px-4 md:px-6 pb-4">
                        <h4 className="text-[10px] text-gray-500 uppercase tracking-[0.3em] mb-3 font-display font-bold flex items-center gap-2">
                          <Crosshair className="w-3.5 h-3.5" /> Waffen
                        </h4>
                        <div className="space-y-2">
                          {(['kinetic', 'energy', 'power'] as const).map(slotId => {
                            const equipped = selectedCharacter.equippedItems.find(i => i.slot === slotId);
                            const slotLabel = slotId === 'kinetic' ? 'Primär' : slotId === 'energy' ? 'Energie' : 'Schwer';
                            const SlotIcon = slotId === 'kinetic' ? Crosshair : slotId === 'energy' ? Zap : Flame;
                            return (
                              <EquippedSlotRow
                                key={slotId}
                                slotId={slotId}
                                slotLabel={slotLabel}
                                SlotIcon={SlotIcon}
                                item={equipped || null}
                                onOpenPicker={() => setSlotPickerSlot(slotId)}
                                onAddToLoadout={equipped ? () => addToLoadout(toItem(equipped)) : undefined}
                              />
                            );
                          })}
                        </div>
                      </div>

                      {/* RÜSTUNG Section */}
                      <div className="px-4 md:px-6 pb-4">
                        <h4 className="text-[10px] text-gray-500 uppercase tracking-[0.3em] mb-3 font-display font-bold flex items-center gap-2">
                          <Shield className="w-3.5 h-3.5" /> Rüstung
                        </h4>
                        <div className="space-y-2">
                          {(['helmet', 'arms', 'chest', 'legs', 'class'] as const).map(slotId => {
                            const equipped = selectedCharacter.equippedItems.find(i => i.slot === slotId);
                            const slotLabels: Record<string, string> = { helmet: 'Kopf', arms: 'Arme', chest: 'Brust', legs: 'Beine', class: 'Klasse' };
                            return (
                              <EquippedSlotRow
                                key={slotId}
                                slotId={slotId}
                                slotLabel={slotLabels[slotId]}
                                SlotIcon={slotId === 'class' ? Hexagon : Shield}
                                item={equipped || null}
                                onOpenPicker={() => setSlotPickerSlot(slotId)}
                                onAddToLoadout={equipped ? () => addToLoadout(toItem(equipped)) : undefined}
                              />
                            );
                          })}
                        </div>
                      </div>

                      {/* SUBKLASSE Section */}
                      <div className="px-4 md:px-6 pb-4">
                        <h4 className="text-[10px] text-gray-500 uppercase tracking-[0.3em] mb-3 font-display font-bold flex items-center gap-2">
                          <Orbit className="w-3.5 h-3.5" /> Subklasse
                        </h4>
                        {(() => {
                          const subclass = selectedCharacter.equippedItems.find(i => i.slot === 'subclass');
                          return (
                            <EquippedSlotRow
                              slotId="subclass"
                              slotLabel="Super"
                              SlotIcon={Orbit}
                              item={subclass || null}
                              onOpenPicker={() => setSlotPickerSlot('subclass')}
                            />
                          );
                        })()}
                      </div>

                      {/* Slot Picker Modal */}
                      <AnimatePresence>
                        {slotPickerSlot && selectedCharacter && (
                          <SlotPickerModal
                            slotId={slotPickerSlot}
                            character={selectedCharacter}
                            vaultItems={vaultItems}
                            onClose={() => setSlotPickerSlot(null)}
                            onEquip={(item) => {
                              handleEquip(item, selectedCharacter.characterId);
                              setSlotPickerSlot(null);
                            }}
                            onAddToLoadout={(item) => addToLoadout(toItem(item))}
                          />
                        )}
                      </AnimatePresence>

                      {/* Quests */}
                      {selectedCharacter.quests.length > 0 && (
                        <div className="px-4 md:px-6 pb-6">
                          <h4 className="text-[10px] text-gray-500 uppercase tracking-[0.3em] mb-3 font-display font-bold flex items-center gap-2">
                            <Activity className="w-3.5 h-3.5" /> Aktive Quests ({selectedCharacter.quests.length})
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {selectedCharacter.quests.map(quest => (
                              <QuestCard key={quest.id} quest={quest} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )}

              {/* TRESOR TAB */}
              {activeTab === 'vault' && (
                <motion.div key="vault" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col lg:flex-row">
                  <div className="flex-1 flex flex-col min-w-0 border-r border-white/5 min-h-0 overflow-hidden">
                    <div className="p-4 md:p-6 pb-2 shrink-0 space-y-3">
                      <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                        <input 
                          type="text"
                          placeholder="Tresor durchsuchen..."
                          value={vaultFilters.search}
                          onChange={(e) => setVaultFilters(f => ({ ...f, search: e.target.value }))}
                          className="w-full bg-[#0A0A0C]/60 border border-white/10 text-white pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-indigo-500/50 transition-all font-light tracking-wider destiny-clip-sm"
                          data-testid="input-search-vault"
                        />
                      </div>
                      <FilterBar filters={vaultFilters} onChange={setVaultFilters} />
                      <p className="text-[10px] text-gray-600 tracking-widest uppercase">{filteredVaultItems.length} Gegenstände</p>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 md:p-6 pt-2">
                      {filteredVaultItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 space-y-4">
                          <Package className="w-12 h-12 text-gray-700" />
                          <p className="text-sm text-gray-500">
                            {vaultFilters.search || vaultFilters.slot !== 'all' || vaultFilters.rarity !== 'all'
                              ? 'Keine Gegenstände gefunden.'
                              : 'Der Tresor ist leer.'}
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 gap-2 md:gap-3">
                          {filteredVaultItems.map(item => (
                            <VaultItemCard
                              key={item.id}
                              item={item}
                              characters={characters}
                              onTransferToChar={(charId) => handleTransfer(item, false, charId)}
                              onEquipOnChar={(charId) => handleEquip(item, charId)}
                              onAddToLoadout={() => addToLoadout(toItem(item))}
                              isInLoadout={loadout[item.slot]?.id === item.id}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Loadout panel desktop */}
                  <div className="hidden lg:flex w-[380px] bg-[#0A0A0C]/40 backdrop-blur-sm flex-col shrink-0 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[60px] pointer-events-none" />
                    <div className="p-6 border-b border-white/5 flex items-center justify-between">
                      <h3 className="text-white font-display font-light tracking-[0.2em] flex items-center gap-3 text-xs">
                        <Sparkles className="w-4 h-4 text-[#E5C76B]" /> AKTIVES LOADOUT
                      </h3>
                      <button 
                        onClick={() => setIsSaveModalOpen(true)}
                        disabled={Object.keys(loadout).length === 0}
                        className="px-4 py-2 bg-white/5 hover:bg-white text-white hover:text-black transition-all duration-500 disabled:opacity-20 border border-white/10 text-[10px] font-bold tracking-[0.2em] destiny-clip-sm"
                        data-testid="button-save-loadout"
                      >
                        SPEICHERN
                      </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-6 space-y-3">
                      {ITEM_SLOTS.map(slot => (
                        <EquippedSlot key={slot.id} slotInfo={slot} item={loadout[slot.id]} onUnequip={() => unequipItem(slot.id)} />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* LOADOUTS TAB */}
              {activeTab === 'loadouts' && (
                <motion.div key="loadouts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full p-4 md:p-8 overflow-y-auto">
                  {isLoadingLoadouts ? (
                    <div className="flex items-center justify-center h-64">
                      <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                    </div>
                  ) : savedLoadouts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500 space-y-6">
                      <Archive className="w-16 h-16 opacity-10" />
                      <p className="font-display tracking-[0.3em] uppercase text-xs">Keine Loadouts gespeichert</p>
                      <p className="text-xs text-gray-600 max-w-md text-center">Gehe zum Tresor oder Hüter-Inventar, stelle ein Loadout zusammen und speichere es hier.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {savedLoadouts.map((saved) => (
                        <div key={saved.id} className="bg-[#0A0A0C]/80 border border-white/10 p-4 group destiny-clip-sm hover:border-white/30 transition-all duration-500" data-testid={`card-loadout-${saved.id}`}>
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
                              <button onClick={() => { setLoadout(saved.items as Record<string, Item>); setActiveTab('vault'); toast({ title: "Loadout geladen" }); }}
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
              )}

              {/* POSTMASTER TAB */}
              {activeTab === 'postmaster' && (
                <motion.div key="postmaster" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full overflow-y-auto p-4 md:p-8">
                  {postmasterItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500 space-y-6">
                      <Mail className="w-16 h-16 opacity-10" />
                      <p className="font-display tracking-[0.3em] uppercase text-xs">Postmeister ist leer</p>
                      <p className="text-xs text-gray-600 max-w-md text-center">Es gibt keine unabgeholten Gegenstände beim Postmeister.</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-4">{postmasterItems.length} Gegenstände beim Postmeister</p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {postmasterItems.map(item => (
                          <div key={item.id} className="bg-[#0A0A0C]/80 border border-amber-500/20 overflow-hidden destiny-clip-sm" data-testid={`card-postmaster-${item.id}`}>
                            <div className="h-0.5 w-full bg-amber-500/60" />
                            <div className="aspect-[4/3] relative overflow-hidden bg-black">
                              <img src={item.screenshot || item.icon} alt={item.name} className="w-full h-full object-cover brightness-90" />
                              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0C] via-transparent to-transparent opacity-90" />
                            </div>
                            <div className="px-2.5 py-2 bg-[#0A0A0C]">
                              <h4 className="text-[9px] font-bold truncate tracking-wider uppercase text-amber-400">{item.name}</h4>
                              <p className="text-[8px] text-gray-500 mt-0.5 uppercase tracking-widest">{item.type}</p>
                              {item.power > 0 && (
                                <p className="text-[9px] text-gray-400 flex items-center gap-1 mt-1">
                                  <Sparkles className="w-2.5 h-2.5 text-[#E5C76B]" /> {item.power}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </main>

      {/* Mobile loadout button */}
      {(activeTab === 'vault' || activeTab === 'characters') && (
        <button onClick={() => setShowMobileLoadout(true)}
          className="lg:hidden fixed bottom-20 right-4 z-30 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-900/50 transition-all"
          data-testid="button-mobile-loadout">
          <Sparkles className="w-5 h-5" />
          {Object.keys(loadout).length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#E5C76B] text-black text-[10px] font-bold rounded-full flex items-center justify-center">
              {Object.keys(loadout).length}
            </span>
          )}
        </button>
      )}

      {/* Mobile loadout overlay */}
      <AnimatePresence>
        {showMobileLoadout && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-40 bg-black/80 backdrop-blur-sm" onClick={() => setShowMobileLoadout(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-[#0A0A0C] border-t border-white/10 rounded-t-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-white/20 rounded-full" />
              </div>
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-white font-display font-light tracking-[0.2em] flex items-center gap-3 text-sm">
                  <Sparkles className="w-4 h-4 text-[#E5C76B]" /> AKTIVES LOADOUT
                </h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => setIsSaveModalOpen(true)} disabled={Object.keys(loadout).length === 0}
                    className="px-4 py-2 bg-white/5 hover:bg-white text-white hover:text-black transition-all disabled:opacity-20 border border-white/10 text-[10px] font-bold tracking-[0.2em] destiny-clip-sm">
                    SPEICHERN
                  </button>
                  <button onClick={() => setShowMobileLoadout(false)} className="p-2 text-gray-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {ITEM_SLOTS.map(slot => (
                  <EquippedSlot key={slot.id} slotInfo={slot} item={loadout[slot.id]} onUnequip={() => unequipItem(slot.id)} />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile bottom nav */}
      <nav className="md:hidden flex items-center justify-around bg-[#0A0A0C] border-t border-white/5 py-2.5 px-2 z-20">
        <MobileNavButton icon={Users} label="HÜTER" active={activeTab === 'characters'} onClick={() => setActiveTab('characters')} />
        <MobileNavButton icon={Package} label="TRESOR" active={activeTab === 'vault'} onClick={() => setActiveTab('vault')} />
        <MobileNavButton icon={Archive} label="LOADOUTS" active={activeTab === 'loadouts'} onClick={() => setActiveTab('loadouts')} />
        <MobileNavButton icon={Mail} label="POST" active={activeTab === 'postmaster'} onClick={() => setActiveTab('postmaster')} />
      </nav>

      <SaveLoadoutModal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} onSave={handleSaveLoadout} />
    </div>
  );
}

/* ---- SUB COMPONENTS ---- */

function FilterBar({ filters, onChange }: { filters: FilterState; onChange: (f: FilterState) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 overflow-x-auto">
        {SLOT_FILTERS.map(sf => (
          <button key={sf.id} onClick={() => onChange({ ...filters, slot: sf.id })}
            className={`px-2.5 py-1 text-[9px] uppercase tracking-widest border transition-all shrink-0 ${
              filters.slot === sf.id ? 'bg-indigo-600/30 border-indigo-500/50 text-white' : 'bg-white/5 border-white/5 text-gray-500 hover:text-white'
            }`} data-testid={`filter-slot-${sf.id}`}>
            {sf.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        {RARITY_FILTERS.map(rf => (
          <button key={rf.id} onClick={() => onChange({ ...filters, rarity: rf.id })}
            className={`px-2.5 py-1 text-[9px] uppercase tracking-widest border transition-all shrink-0 ${
              filters.rarity === rf.id ? 'bg-indigo-600/30 border-indigo-500/50 text-white' : 'bg-white/5 border-white/5 text-gray-500 hover:text-white'
            }`} data-testid={`filter-rarity-${rf.id}`}>
            {rf.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1.5">
        <input type="number" placeholder="Min" value={filters.minPower} onChange={e => onChange({ ...filters, minPower: e.target.value })}
          className="w-16 bg-white/5 border border-white/5 text-white text-[10px] px-2 py-1 focus:outline-none focus:border-indigo-500/50" data-testid="input-min-power" />
        <span className="text-gray-600 text-[10px]">-</span>
        <input type="number" placeholder="Max" value={filters.maxPower} onChange={e => onChange({ ...filters, maxPower: e.target.value })}
          className="w-16 bg-white/5 border border-white/5 text-white text-[10px] px-2 py-1 focus:outline-none focus:border-indigo-500/50" data-testid="input-max-power" />
        <Sparkles className="w-3 h-3 text-[#E5C76B] opacity-50" />
      </div>
    </div>
  );
}

function EquippedSlotRow({ slotId, slotLabel, SlotIcon, item, onOpenPicker, onAddToLoadout }: {
  slotId: string;
  slotLabel: string;
  SlotIcon: React.ElementType;
  item: InventoryItem | null;
  onOpenPicker: () => void;
  onAddToLoadout?: () => void;
}) {
  const isExotic = item?.rarity === 'exotic';
  const rarityColor = isExotic ? '#E5C76B' : '#7D5C96';
  return (
    <div className="group flex items-center gap-3 bg-black/30 border border-white/5 p-2.5 hover:border-white/15 transition-all" data-testid={`equipped-slot-${slotId}`}>
      <div className="w-12 h-12 shrink-0 border border-white/10 overflow-hidden relative bg-black/50 flex items-center justify-center">
        {item ? (
          <>
            <div className="absolute top-0 left-0 w-full h-0.5 z-10" style={{ backgroundColor: rarityColor }} />
            <img src={item.icon} alt={item.name} className="w-full h-full object-cover" />
          </>
        ) : (
          <SlotIcon className="w-5 h-5 text-white/10" strokeWidth={1} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[8px] text-gray-600 uppercase tracking-[0.2em] mb-0.5">{slotLabel}</p>
        {item ? (
          <>
            <p className="text-[10px] font-bold truncate tracking-wider uppercase" style={{ color: isExotic ? '#E5C76B' : 'white' }}>{item.name}</p>
            <p className="text-[8px] text-gray-500 flex items-center gap-1 mt-0.5">
              {item.power > 0 && <><Sparkles className="w-2.5 h-2.5 text-[#E5C76B] opacity-70" /> {item.power}</>}
              <span className="text-gray-600 ml-1">{item.type}</span>
            </p>
          </>
        ) : (
          <p className="text-[10px] text-gray-700 uppercase tracking-widest">Leer</p>
        )}
      </div>
      <div className="flex items-center gap-1">
        {onAddToLoadout && item && (
          <button onClick={(e) => { e.stopPropagation(); onAddToLoadout(); }} className="p-1.5 text-gray-600 hover:text-[#E5C76B] hover:bg-white/5 rounded opacity-0 group-hover:opacity-100 transition-all" title="Zum Loadout" data-testid={`button-loadout-${slotId}`}>
            <Sparkles className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={onOpenPicker} className="p-1.5 text-gray-500 hover:text-white hover:bg-indigo-500/20 rounded transition-all border border-transparent hover:border-indigo-500/30" title="Wechseln" data-testid={`button-swap-${slotId}`}>
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function SlotPickerModal({ slotId, character, vaultItems, onClose, onEquip, onAddToLoadout }: {
  slotId: string;
  character: CharacterData;
  vaultItems: InventoryItem[];
  onClose: () => void;
  onEquip: (item: InventoryItem) => void;
  onAddToLoadout: (item: InventoryItem) => void;
}) {
  const [searchText, setSearchText] = useState('');
  const [showVault, setShowVault] = useState(false);

  const slotLabels: Record<string, string> = {
    kinetic: 'Primär', energy: 'Energie', power: 'Schwer',
    helmet: 'Kopf', arms: 'Arme', chest: 'Brust', legs: 'Beine', class: 'Klasse',
    subclass: 'Subklasse',
  };

  const filtered = useMemo(() => {
    const charItems = character.inventory.filter(i => i.slot === slotId);
    const vaultSlotItems = showVault ? vaultItems.filter(i => i.slot === slotId) : [];
    const allItems = [...charItems, ...vaultSlotItems];
    if (!searchText) return allItems;
    const q = searchText.toLowerCase();
    return allItems.filter(i => i.name.toLowerCase().includes(q) || i.type.toLowerCase().includes(q));
  }, [character.inventory, vaultItems, slotId, showVault, searchText]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-[#0A0A0C] border border-white/10 w-[90vw] max-w-lg max-h-[80vh] flex flex-col shadow-2xl shadow-black/80"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-white font-display font-light tracking-[0.2em] text-sm uppercase">{slotLabels[slotId] || slotId} wechseln</h3>
            <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">{filtered.length} verfügbar</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded transition-all" data-testid="button-close-picker">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 border-b border-white/5 shrink-0 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              placeholder="Suchen..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full bg-white/5 border border-white/5 text-white pl-8 pr-3 py-2 text-xs focus:outline-none focus:border-indigo-500/50 transition-all tracking-wider"
              data-testid="input-picker-search"
              autoFocus
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={showVault} onChange={(e) => setShowVault(e.target.checked)} className="accent-indigo-500" data-testid="checkbox-show-vault" />
            <span className="text-[10px] text-gray-400 uppercase tracking-widest">Tresor einbeziehen</span>
          </label>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {filtered.length === 0 ? (
            <p className="text-xs text-gray-600 text-center py-8">Keine Gegenstände für diesen Slot verfügbar.</p>
          ) : (
            filtered.sort((a, b) => b.power - a.power).map(item => {
              const isExotic = item.rarity === 'exotic';
              const fromVault = item.location === 'vault';
              return (
                <div key={item.id} className="group flex items-center gap-3 bg-black/40 border border-white/5 p-2 hover:border-white/20 hover:bg-white/[0.02] transition-all cursor-pointer" onClick={() => onEquip(item)} data-testid={`picker-item-${item.id}`}>
                  <div className="w-10 h-10 shrink-0 border border-white/10 overflow-hidden relative bg-black">
                    <div className="absolute top-0 left-0 w-full h-0.5" style={{ backgroundColor: isExotic ? '#E5C76B' : '#7D5C96' }} />
                    <img src={item.icon} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold truncate tracking-wider uppercase" style={{ color: isExotic ? '#E5C76B' : 'white' }}>{item.name}</p>
                    <p className="text-[8px] text-gray-500 flex items-center gap-1 mt-0.5">
                      {item.power > 0 && <><Sparkles className="w-2.5 h-2.5 text-[#E5C76B] opacity-70" /> {item.power}</>}
                      <span className="text-gray-600 ml-1">{item.type}</span>
                      {fromVault && <span className="text-indigo-400 ml-1">• Tresor</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); onAddToLoadout(item); }} className="p-1.5 text-gray-600 hover:text-[#E5C76B] hover:bg-white/5 rounded opacity-0 group-hover:opacity-100 transition-all" title="Zum Loadout">
                      <Sparkles className="w-3 h-3" />
                    </button>
                    <div className="p-1.5 text-indigo-400">
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function VaultItemCard({ item, characters, onTransferToChar, onEquipOnChar, onAddToLoadout, isInLoadout }: {
  item: InventoryItem;
  characters: CharacterData[];
  onTransferToChar: (charId: string) => void;
  onEquipOnChar: (charId: string) => void;
  onAddToLoadout: () => void;
  isInLoadout: boolean;
}) {
  const [showActions, setShowActions] = useState(false);
  const isExotic = item.rarity === 'exotic';
  const rarityColor = isExotic ? '#E5C76B' : '#7D5C96';

  return (
    <div className={`group relative bg-[#0A0A0C]/80 border border-white/10 overflow-hidden transition-all duration-500 destiny-clip-sm ${
      isInLoadout ? 'opacity-30 grayscale-[70%]' : 'hover:border-white/40'
    }`}>
      <div className="h-0.5 w-full" style={{ backgroundColor: rarityColor }} />
      <div className="aspect-[4/3] relative overflow-hidden bg-black cursor-pointer" onClick={() => setShowActions(!showActions)}>
        <img src={item.screenshot || item.icon} alt={item.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 brightness-90 group-hover:brightness-110" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0C] via-transparent to-transparent opacity-90" />
      </div>
      <div className="px-2.5 py-2 bg-[#0A0A0C] relative z-10">
        <h4 className="text-[9px] font-bold truncate tracking-wider uppercase" style={{ color: isExotic ? '#E5C76B' : 'white' }}>{item.name}</h4>
        <div className="flex items-center justify-between mt-0.5">
          <p className="text-[8px] text-gray-500 uppercase tracking-widest">{item.type}</p>
          {item.power > 0 && (
            <p className="text-[8px] text-gray-400 flex items-center gap-0.5">
              <Sparkles className="w-2 h-2 text-[#E5C76B]" /> {item.power}
            </p>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showActions && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="border-t border-white/5 bg-[#0A0A0C] overflow-hidden">
            <div className="p-2 space-y-1">
              <button onClick={() => { onAddToLoadout(); setShowActions(false); }}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-[9px] uppercase tracking-widest text-[#E5C76B] hover:bg-white/5 transition-all">
                <Sparkles className="w-3 h-3" /> Zum Loadout
              </button>
              {characters.map(c => (
                <div key={c.characterId} className="flex items-center gap-1">
                  <button onClick={() => { onTransferToChar(c.characterId); setShowActions(false); }}
                    className="flex-1 flex items-center gap-2 px-2 py-1.5 text-[9px] uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/5 transition-all">
                    <ArrowRightLeft className="w-3 h-3" /> → {c.className}
                  </button>
                  <button onClick={() => { onEquipOnChar(c.characterId); setShowActions(false); }}
                    className="px-2 py-1.5 text-[9px] uppercase tracking-widest text-indigo-400 hover:text-white hover:bg-indigo-500/20 transition-all" title="Anlegen">
                    <Shield className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function QuestCard({ quest }: { quest: QuestItem }) {
  return (
    <div className="flex items-center gap-3 bg-black/40 border border-white/5 p-3 hover:border-white/20 transition-all" data-testid={`card-quest-${quest.id}`}>
      <div className="w-10 h-10 shrink-0 border border-white/10 overflow-hidden bg-black">
        {quest.icon && <img src={quest.icon} alt="" className="w-full h-full object-cover" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold truncate tracking-wider uppercase text-white">{quest.name}</p>
        {quest.description && (
          <p className="text-[9px] text-gray-500 truncate mt-0.5">{quest.description}</p>
        )}
        <p className="text-[8px] text-indigo-400/60 uppercase tracking-widest mt-1">{quest.type || 'Quest'}</p>
      </div>
    </div>
  );
}
