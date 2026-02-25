import { useState, useEffect, useMemo } from 'react';
import { 
  Settings, Share2, Search, Crosshair, Menu,
  Zap, Flame, Hexagon, Shield, Check, Archive,
  Sparkles, Activity, Loader2, AlertTriangle, RefreshCw,
  Users, ArrowRightLeft, Trash2, X, Package, Mail,
  ChevronDown, ChevronUp, Filter, SlidersHorizontal, Coins,
  Plus, Sword, ShieldHalf, Orbit, Eye, ScrollText
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import hunterBgImg from '@assets/IMG_0576_1772037013335.jpeg';

import { useBungieAuth } from '@/hooks/use-bungie-auth';
import { useLoadouts, useSaveLoadout, useDeleteLoadout } from '@/hooks/use-loadouts';
import { useProfileState, type InventoryItem, type CharacterData, type CurrencyInfo, type QuestItem } from '@/hooks/use-profile-state';
import { useTransferItem, useEquipItem, useSwapItem } from '@/hooks/use-transfer';

import { DesktopNavButton, MobileNavButton, UserProfile } from '@/components/Navigation';
import { ItemCard, EquippedSlot, type Item, type SlotInfo } from '@/components/Inventory';
import { SaveLoadoutModal } from '@/components/SaveLoadoutModal';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';

type TabType = 'characters' | 'vault' | 'loadouts' | 'postmaster';

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
  const { t } = useI18n();

  const ITEM_SLOTS: SlotInfo[] = [
    { id: 'kinetic', label: t('slot.kinetic'), icon: Crosshair },
    { id: 'energy', label: t('slot.energy'), icon: Zap },
    { id: 'power', label: t('slot.power'), icon: Flame },
    { id: 'helmet', label: t('slot.helmet'), icon: Shield },
    { id: 'arms', label: t('slot.arms'), icon: Shield },
    { id: 'chest', label: t('slot.chest'), icon: Shield },
    { id: 'legs', label: t('slot.legs'), icon: Shield },
    { id: 'class', label: t('slot.class'), icon: Hexagon },
    { id: 'subclass', label: t('slot.subclass'), icon: Orbit },
  ];

  const SLOT_FILTERS = [
    { id: 'all', label: t('filter.all') },
    { id: 'kinetic', label: t('slot.kinetic') },
    { id: 'energy', label: t('slot.energy') },
    { id: 'power', label: t('slot.power') },
    { id: 'helmet', label: t('slot.helmet') },
    { id: 'arms', label: t('slot.arms') },
    { id: 'chest', label: t('slot.chest') },
    { id: 'legs', label: t('slot.legs') },
    { id: 'class', label: t('slot.class') },
    { id: 'subclass', label: t('slot.subclass') },
  ];

  const RARITY_FILTERS = [
    { id: 'all', label: t('filter.all') },
    { id: 'exotic', label: t('filter.exotic') },
    { id: 'legendary', label: t('filter.legendary') },
    { id: 'rare', label: t('filter.rare') },
  ];

  const [activeTab, setActiveTab] = useState<TabType>('characters');
  const [loadout, setLoadout] = useState<Record<string, Item>>({});
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [showMobileLoadout, setShowMobileLoadout] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [vaultFilters, setVaultFilters] = useState<FilterState>({ search: '', slot: 'all', rarity: 'all', minPower: '', maxPower: '' });
  const [slotPickerSlot, setSlotPickerSlot] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
        toast({ title: t('toast.loadoutAdopted'), description: t('toast.loadoutAdoptedDesc') });
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
    toast({ title: t('toast.added'), description: `${item.name} ${t('toast.addedDesc')}`, duration: 2000 });
  };

  const unequipItem = (slotId: string) => {
    setLoadout(prev => { const n = { ...prev }; delete n[slotId]; return n; });
  };

  const handleSaveLoadout = async (name: string) => {
    if (!destinyProfile?.membershipId) return;
    const shareCode = Math.random().toString(36).substring(2, 10);
    await saveLoadoutMutation.mutateAsync({ bungieMembershipId: destinyProfile.membershipId, name, items: loadout as any, shareCode });
    toast({ title: t('toast.saved'), description: `"${name}" ${t('toast.savedDesc')}` });
    setActiveTab('loadouts');
  };

  const handleDeleteLoadout = async (id: number) => {
    if (!destinyProfile?.membershipId) return;
    await deleteLoadoutMutation.mutateAsync({ id, bungieMembershipId: destinyProfile.membershipId });
    toast({ title: t('toast.deleted') });
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
      toast({ title: t('toast.moved'), description: `${item.name} ${t('toast.movedDesc')}` });
    } catch (err: any) {
      toast({ title: t('error.generic'), description: err.message, variant: "destructive" });
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
      toast({ title: t('toast.equipped'), description: `${item.name} ${t('toast.equippedDesc')}` });
    } catch (err: any) {
      toast({ title: t('error.generic'), description: err.message, variant: "destructive" });
    }
  };

  const copyToClipboard = (code: string) => {
    const link = `${window.location.origin}/share/${code}`;
    navigator.clipboard.writeText(link).then(() => {
      toast({ title: t('toast.linkCopied') });
    });
  };

  const tabTitles: Record<TabType, string> = {
    characters: t('nav.characters'),
    vault: t('nav.vault'),
    loadouts: t('nav.loadouts'),
    postmaster: t('nav.postmaster'),
  };

  return (
    <div className="h-screen bg-app text-gray-300 font-sans selection:bg-indigo-500/30 flex flex-col md:flex-row overflow-hidden relative">
      <div className="fixed inset-0 pointer-events-none z-0 bg-app-overlay">
        <div className="absolute top-[-15%] left-[-5%] w-[45%] h-[45%] bg-indigo-900/15 blur-[150px] rounded-full animate-pulse-glow" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[40%] h-[40%] bg-purple-900/10 blur-[130px] rounded-full" />
        <div className="absolute top-[30%] right-[20%] w-[25%] h-[25%] bg-blue-900/8 blur-[100px] rounded-full" />
      </div>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar backdrop-blur-xl border-r border-white/[0.06] shrink-0 z-20 shadow-2xl relative">
        <div className="p-6 pb-2">
          <div className="flex items-center space-x-3 mb-6">
            <Hexagon className="w-8 h-8 text-white shadow-[0_0_20px_rgba(255,255,255,0.2)]" strokeWidth={1.5} />
            <span className="font-display font-light text-lg tracking-[0.2em] text-white">GUARDIANGRID <span className="text-[#E5C76B] text-sm">(Adept)</span></span>
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
        <header className="h-14 md:h-16 border-b border-white/[0.06] bg-header backdrop-blur-xl flex items-center justify-between px-4 md:px-8 shrink-0 z-10">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 -ml-1 text-white hover:text-indigo-400 transition-colors"
              data-testid="button-menu-toggle"
            >
              <AnimatePresence mode="wait">
                {isMenuOpen ? (
                  <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <X className="w-6 h-6" />
                  </motion.div>
                ) : (
                  <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <Menu className="w-6 h-6" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
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

        <AnimatePresence>
          {isMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30"
                onClick={() => setIsMenuOpen(false)}
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed top-0 left-0 bottom-0 w-72 bg-[#0a0e1a]/98 backdrop-blur-2xl border-r border-white/[0.08] z-40 flex flex-col"
              >
                <div className="p-6 pb-4 border-b border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-lg tracking-[0.15em] text-white">GUARDIANGRID <span className="text-[#E5C76B] text-sm">(Adept)</span></span>
                    <button onClick={() => setIsMenuOpen(false)} className="p-1.5 text-gray-500 hover:text-white transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <nav className="flex-1 py-4 px-3">
                  {[
                    { key: 'guardian', id: 'characters' as TabType, icon: Users, label: t('nav.guardian') },
                    { key: 'vault', id: 'vault' as TabType, icon: Package, label: t('nav.vault') },
                    { key: 'postmaster', id: 'postmaster' as TabType, icon: Mail, label: t('nav.postmaster') },
                    { key: 'quests', id: 'characters' as TabType, icon: ScrollText, label: 'Quests' },
                  ].map((item, i) => (
                    <motion.button
                      key={item.key}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 + i * 0.06, duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                      onClick={() => { setActiveTab(item.id); setIsMenuOpen(false); }}
                      className={`w-full flex items-center gap-4 px-4 py-3.5 mb-1 rounded-lg transition-all duration-300 ${
                        (item.key === 'guardian' && activeTab === 'characters') || (item.key !== 'guardian' && item.key !== 'quests' && activeTab === item.id)
                          ? 'bg-white/[0.08] text-white'
                          : 'text-gray-500 hover:text-white hover:bg-white/[0.04]'
                      }`}
                      data-testid={`menu-item-${item.key}`}
                    >
                      <item.icon className={`w-5 h-5 ${(item.key === 'guardian' && activeTab === 'characters') || (item.key !== 'guardian' && item.key !== 'quests' && activeTab === item.id) ? 'text-indigo-400' : ''}`} />
                      <span className="text-sm font-display tracking-[0.15em] uppercase">{item.label}</span>
                      {((item.key === 'guardian' && activeTab === 'characters') || (item.key !== 'guardian' && item.key !== 'quests' && activeTab === item.id)) && (
                        <motion.div
                          layoutId="menu-indicator"
                          className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400"
                        />
                      )}
                    </motion.button>
                  ))}
                </nav>
                {currencies.length > 0 && (
                  <div className="px-6 py-4 border-t border-white/[0.06]">
                    <div className="flex items-center gap-4">
                      {currencies.slice(0, 3).map(c => (
                        <div key={c.itemHash} className="flex items-center gap-1.5" title={c.name}>
                          {c.icon && <img src={c.icon} alt="" className="w-4 h-4 opacity-70" />}
                          <span className="text-[10px] text-gray-400 font-mono">{c.quantity.toLocaleString('de-DE')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className="flex-1 min-h-0 overflow-hidden relative">
          {activeTab === 'characters' && selectedCharacter?.className === 'Hunter' && (
            <>
              <img src={hunterBgImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.35] pointer-events-none z-0" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080b14] via-[#080b14]/50 to-transparent pointer-events-none z-0" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#080b14]/70 via-transparent to-[#080b14]/40 pointer-events-none z-0" />
            </>
          )}
          {isLoadingProfile ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] font-display">{t('loading.profile')}</p>
            </div>
          ) : profileError ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
              <p className="text-sm text-gray-400 text-center max-w-md">{t('error.profile')}</p>
              <button onClick={() => refetchProfile()} className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all destiny-clip-sm">
                <RefreshCw className="w-3.5 h-3.5" /> {t('error.retry')}
              </button>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {/* HÜTER TAB */}
              {activeTab === 'characters' && (
                <motion.div key="characters" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col relative">
                  {/* Character selector */}
                  <div className="flex items-center gap-2 p-3 md:p-4 border-b border-white/[0.06] shrink-0 overflow-x-auto bg-black/20">
                    {characters.map(char => (
                      <button
                        key={char.characterId}
                        onClick={() => setSelectedCharacterId(char.characterId)}
                        className={`flex items-center gap-2.5 px-3.5 py-2.5 border transition-all duration-300 shrink-0 relative overflow-hidden ${
                          selectedCharacterId === char.characterId
                            ? 'bg-gradient-to-r from-indigo-600/20 to-transparent border-indigo-500/40 text-white shadow-lg shadow-indigo-900/20'
                            : 'bg-white/[0.03] border-white/[0.06] text-gray-400 hover:border-white/20 hover:bg-white/[0.05]'
                        }`}
                        data-testid={`button-select-char-${char.characterId}`}
                      >
                        {selectedCharacterId === char.characterId && (
                          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 to-purple-500" />
                        )}
                        {char.emblemPath && <img src={char.emblemPath} alt="" className="w-9 h-9 ring-1 ring-white/10" />}
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
                      <div className="relative overflow-hidden">
                        {selectedCharacter.emblemBackgroundPath && (
                          <img src={selectedCharacter.emblemBackgroundPath} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#080b14] via-transparent to-transparent" />
                        <div className="relative z-10 p-5 md:p-7 flex items-center justify-between">
                          <div>
                            <h3 className="text-2xl md:text-3xl text-white font-display font-light tracking-wider text-shadow-glow">{selectedCharacter.className}</h3>
                            <p className="text-[10px] text-gray-400 uppercase tracking-[0.3em] mt-1">{selectedCharacter.raceName}</p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2.5 justify-end">
                              <Sparkles className="w-5 h-5 text-[#E5C76B] animate-pulse-glow" />
                              <span className="text-4xl font-display font-light text-white text-shadow-glow" data-testid="text-power-level">{selectedCharacter.light}</span>
                            </div>
                            <p className="text-[9px] text-gray-500 uppercase tracking-[0.25em] mt-1.5">{t('power.label')}</p>
                          </div>
                        </div>
                      </div>

                      {/* Stats */}
                      {Object.keys(selectedCharacter.stats).length > 0 && (
                        <div className="px-4 md:px-6 pb-5">
                          <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5">
                            {Object.entries(selectedCharacter.stats).map(([name, val]) => (
                              <div key={name} className="bg-gradient-to-b from-white/[0.04] to-transparent border border-white/[0.06] p-2.5 text-center group/stat hover:border-indigo-500/20 transition-all duration-300">
                                <p className="text-[8px] text-gray-600 uppercase tracking-[0.2em] mb-1 group-hover/stat:text-gray-400 transition-colors">{name}</p>
                                <p className="text-base font-display text-white font-light group-hover/stat:text-indigo-300 transition-colors" data-testid={`text-stat-${name.toLowerCase()}`}>{val}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* WAFFEN Section */}
                      <div className="px-4 md:px-6 pb-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-sm bg-gradient-to-br from-red-500/20 to-orange-500/10 flex items-center justify-center">
                              <Crosshair className="w-3.5 h-3.5 text-red-400/80" />
                            </div>
                            <h4 className="text-[11px] text-white/80 uppercase tracking-[0.25em] font-display font-semibold">{t('section.weapons')}</h4>
                          </div>
                          <div className="flex-1 section-divider" />
                        </div>
                        <div className="space-y-1">
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
                                isExpanded={slotPickerSlot === slotId}
                                onTogglePicker={() => setSlotPickerSlot(slotPickerSlot === slotId ? null : slotId)}
                                onAddToLoadout={equipped ? () => addToLoadout(toItem(equipped)) : undefined}
                                character={selectedCharacter}
                                vaultItems={vaultItems}
                                onEquip={(item) => { handleEquip(item, selectedCharacter.characterId); setSlotPickerSlot(null); }}
                                onAddToLoadoutItem={(item) => addToLoadout(toItem(item))}
                              />
                            );
                          })}
                        </div>
                      </div>

                      {/* RÜSTUNG Section */}
                      <div className="px-4 md:px-6 pb-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-sm bg-gradient-to-br from-blue-500/20 to-indigo-500/10 flex items-center justify-center">
                              <Shield className="w-3.5 h-3.5 text-blue-400/80" />
                            </div>
                            <h4 className="text-[11px] text-white/80 uppercase tracking-[0.25em] font-display font-semibold">{t('section.armor')}</h4>
                          </div>
                          <div className="flex-1 section-divider" />
                        </div>
                        <div className="space-y-1">
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
                                isExpanded={slotPickerSlot === slotId}
                                onTogglePicker={() => setSlotPickerSlot(slotPickerSlot === slotId ? null : slotId)}
                                onAddToLoadout={equipped ? () => addToLoadout(toItem(equipped)) : undefined}
                                character={selectedCharacter}
                                vaultItems={vaultItems}
                                onEquip={(item) => { handleEquip(item, selectedCharacter.characterId); setSlotPickerSlot(null); }}
                                onAddToLoadoutItem={(item) => addToLoadout(toItem(item))}
                              />
                            );
                          })}
                        </div>
                      </div>

                      {/* SUBKLASSE Section */}
                      <div className="px-4 md:px-6 pb-5">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-sm bg-gradient-to-br from-purple-500/20 to-violet-500/10 flex items-center justify-center">
                              <Orbit className="w-3.5 h-3.5 text-purple-400/80" />
                            </div>
                            <h4 className="text-[11px] text-white/80 uppercase tracking-[0.25em] font-display font-semibold">Subklasse</h4>
                          </div>
                          <div className="flex-1 section-divider" />
                        </div>
                        {(() => {
                          const subclass = selectedCharacter.equippedItems.find(i => i.slot === 'subclass');
                          return (
                            <EquippedSlotRow
                              slotId="subclass"
                              slotLabel="Super"
                              SlotIcon={Orbit}
                              item={subclass || null}
                              isExpanded={slotPickerSlot === 'subclass'}
                              onTogglePicker={() => setSlotPickerSlot(slotPickerSlot === 'subclass' ? null : 'subclass')}
                              character={selectedCharacter}
                              vaultItems={vaultItems}
                              onEquip={(item) => { handleEquip(item, selectedCharacter.characterId); setSlotPickerSlot(null); }}
                              onAddToLoadoutItem={(item) => addToLoadout(toItem(item))}
                            />
                          );
                        })()}
                      </div>

                      {/* Quests */}
                      {selectedCharacter.quests.length > 0 && (
                        <div className="px-4 md:px-6 pb-6">
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-sm bg-gradient-to-br from-green-500/20 to-emerald-500/10 flex items-center justify-center">
                                <Activity className="w-3.5 h-3.5 text-green-400/80" />
                              </div>
                              <h4 className="text-[11px] text-white/80 uppercase tracking-[0.25em] font-display font-semibold">Aktive Quests</h4>
                              <span className="text-[9px] text-gray-600 bg-white/[0.04] px-2 py-0.5 rounded-sm">{selectedCharacter.quests.length}</span>
                            </div>
                            <div className="flex-1 section-divider" />
                          </div>
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
                          placeholder={t('vault.search')}
                          value={vaultFilters.search}
                          onChange={(e) => setVaultFilters(f => ({ ...f, search: e.target.value }))}
                          className="w-full bg-[#0a0e18]/80 border border-white/[0.08] text-white pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-indigo-500/40 transition-all font-light tracking-wider destiny-clip-sm"
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
                              ? t('item.noneAvailable')
                              : t('item.noneAvailable')}
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
                  <div className="hidden lg:flex w-[380px] bg-[#0a0e18]/60 backdrop-blur-sm flex-col shrink-0 relative overflow-hidden">
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
                          <div key={item.id} className="bg-gradient-to-b from-amber-500/[0.03] to-transparent border border-amber-500/15 overflow-hidden destiny-clip-sm hover:border-amber-500/30 transition-all duration-300" data-testid={`card-postmaster-${item.id}`}>
                            <div className="h-[2px] w-full bg-amber-500/60" />
                            <div className="aspect-[4/3] relative overflow-hidden bg-black/80">
                              <img src={item.screenshot || item.icon} alt={item.name} className="w-full h-full object-cover brightness-90" />
                              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e18] via-transparent to-transparent opacity-90" />
                            </div>
                            <div className="px-2.5 py-2">
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
              className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-[#0a0e18] border-t border-white/[0.08] rounded-t-2xl flex flex-col"
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

function EquippedSlotRow({ slotId, slotLabel, SlotIcon, item, isExpanded, onTogglePicker, onAddToLoadout, character, vaultItems, onEquip, onAddToLoadoutItem }: {
  slotId: string;
  slotLabel: string;
  SlotIcon: React.ElementType;
  item: InventoryItem | null;
  isExpanded: boolean;
  onTogglePicker: () => void;
  onAddToLoadout?: () => void;
  character: CharacterData;
  vaultItems: InventoryItem[];
  onEquip: (item: InventoryItem) => void;
  onAddToLoadoutItem: (item: InventoryItem) => void;
}) {
  const [searchText, setSearchText] = useState('');
  const [showVault, setShowVault] = useState(false);
  const { t } = useI18n();
  const isExotic = item?.rarity === 'exotic';
  const rarityColor = isExotic ? '#E5C76B' : '#7D5C96';

  const filtered = useMemo(() => {
    const charItems = character.inventory.filter(i => i.slot === slotId);
    const vaultSlotItems = showVault ? vaultItems.filter(i => i.slot === slotId) : [];
    const allItems = [...charItems, ...vaultSlotItems];
    if (!searchText) return allItems.sort((a, b) => b.power - a.power);
    const q = searchText.toLowerCase();
    return allItems.filter(i => i.name.toLowerCase().includes(q) || i.type.toLowerCase().includes(q)).sort((a, b) => b.power - a.power);
  }, [character.inventory, vaultItems, slotId, showVault, searchText]);

  return (
    <div className="relative" data-testid={`equipped-slot-${slotId}`}>
      <div
        className={`group flex items-center gap-3 p-3 border transition-all duration-300 cursor-pointer relative overflow-hidden ${
          isExpanded
            ? 'slot-row-active border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-transparent to-transparent'
            : 'bg-black/40 border-white/[0.06] hover:border-white/20 hover:bg-white/[0.03]'
        }`}
        onClick={onTogglePicker}
      >
        {item && (
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none">
            <img src={item.screenshot || item.icon} alt="" className="w-full h-full object-cover blur-sm" />
          </div>
        )}
        <div className="absolute left-0 top-0 bottom-0 w-[2px] transition-all duration-300" style={{ backgroundColor: isExpanded ? '#6366f1' : item ? rarityColor : 'transparent' }} />

        <div className={`w-12 h-12 shrink-0 overflow-hidden relative flex items-center justify-center transition-all duration-300 ${
          item ? (isExotic ? 'rarity-exotic-glow' : 'rarity-legendary-glow') : ''
        } ${isExpanded ? 'ring-1 ring-indigo-500/40' : 'ring-1 ring-white/10'}`}>
          {item ? (
            <>
              <div className="absolute top-0 left-0 w-full h-[2px] z-10" style={{ backgroundColor: rarityColor }} />
              <img src={item.icon} alt={item.name} className="w-full h-full object-cover" />
            </>
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-white/[0.04] to-transparent flex items-center justify-center">
              <SlotIcon className="w-5 h-5 text-white/15" strokeWidth={1.5} />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0 relative z-10">
          <p className="text-[8px] text-gray-500 uppercase tracking-[0.25em] mb-0.5 font-medium">{slotLabel}</p>
          {item ? (
            <>
              <p className="text-[11px] font-bold truncate tracking-wider uppercase" style={{ color: isExotic ? '#E5C76B' : 'white' }}>{item.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {item.power > 0 && (
                  <span className="text-[9px] text-yellow-500/80 flex items-center gap-0.5 font-medium">
                    <Sparkles className="w-2.5 h-2.5" /> {item.power}
                  </span>
                )}
                <span className="text-[8px] text-gray-600">{item.type}</span>
              </div>
            </>
          ) : (
            <p className="text-[10px] text-gray-700 uppercase tracking-widest italic">{t('item.none')}</p>
          )}
        </div>

        <div className="flex items-center gap-1.5 relative z-10">
          {onAddToLoadout && item && (
            <button onClick={(e) => { e.stopPropagation(); onAddToLoadout(); }} className="p-1.5 text-gray-600 hover:text-[#E5C76B] hover:bg-yellow-500/10 rounded-sm opacity-0 group-hover:opacity-100 transition-all duration-200" title={t('action.toLoadout')} data-testid={`button-loadout-${slotId}`}>
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          )}
          <div className={`p-1.5 rounded-sm transition-all duration-300 ${
            isExpanded ? 'bg-indigo-500/20 text-indigo-400' : 'text-gray-600 hover:text-white hover:bg-white/10'
          }`} data-testid={`button-swap-${slotId}`}>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="border-x border-b border-indigo-500/15 bg-gradient-to-b from-indigo-500/[0.04] to-black/50">
              <div className="p-3 flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-600" />
                  <input
                    type="text"
                    placeholder="Suchen..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="w-full bg-black/40 border border-white/[0.06] text-white pl-7 pr-3 py-1.5 text-[11px] focus:outline-none focus:border-indigo-500/40 transition-all tracking-wider rounded-sm"
                    data-testid="input-picker-search"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer shrink-0" onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={showVault} onChange={(e) => setShowVault(e.target.checked)} className="accent-indigo-500 w-3 h-3" data-testid="checkbox-show-vault" />
                  <span className="text-[9px] text-gray-500 uppercase tracking-widest">{t('nav.vault')}</span>
                </label>
                <span className="text-[9px] text-gray-600 shrink-0">{filtered.length}</span>
              </div>

              <div className="max-h-[280px] overflow-y-auto px-3 pb-3 space-y-1">
                {filtered.length === 0 ? (
                  <p className="text-[10px] text-gray-600 text-center py-6 italic">{t('item.noneAvailable')}</p>
                ) : (
                  filtered.map((invItem, idx) => {
                    const isItemExotic = invItem.rarity === 'exotic';
                    const fromVault = invItem.location === 'vault';
                    return (
                      <motion.div
                        key={invItem.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.03, duration: 0.2 }}
                        className={`group/item flex items-center gap-2.5 p-2 border cursor-pointer transition-all duration-200 item-card-hover relative overflow-hidden ${
                          isItemExotic
                            ? 'border-yellow-500/10 hover:border-yellow-500/30 bg-yellow-500/[0.02] hover:bg-yellow-500/[0.06]'
                            : 'border-white/[0.04] hover:border-purple-400/20 bg-white/[0.01] hover:bg-white/[0.04]'
                        }`}
                        onClick={(e) => { e.stopPropagation(); onEquip(invItem); }}
                        data-testid={`picker-item-${invItem.id}`}
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ backgroundColor: isItemExotic ? '#E5C76B' : '#7D5C96' }} />
                        <div className={`w-9 h-9 shrink-0 overflow-hidden relative ${isItemExotic ? 'ring-1 ring-yellow-500/20' : 'ring-1 ring-white/10'}`}>
                          <img src={invItem.icon} alt={invItem.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold truncate tracking-wider uppercase" style={{ color: isItemExotic ? '#E5C76B' : '#e0e0e0' }}>{invItem.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {invItem.power > 0 && (
                              <span className="text-[8px] text-yellow-500/70 flex items-center gap-0.5">
                                <Sparkles className="w-2 h-2" /> {invItem.power}
                              </span>
                            )}
                            <span className="text-[7px] text-gray-600 uppercase">{invItem.type}</span>
                            {fromVault && <span className="text-[7px] text-indigo-400/70 uppercase">{t('vault.label')}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <button onClick={(e) => { e.stopPropagation(); onAddToLoadoutItem(invItem); }} className="p-1 text-gray-700 hover:text-[#E5C76B] transition-all opacity-0 group-hover/item:opacity-100" title={t('action.toLoadout')}>
                            <Sparkles className="w-3 h-3" />
                          </button>
                          <div className="p-1 text-indigo-400/50 group-hover/item:text-indigo-400 transition-all">
                            <ArrowRightLeft className="w-3 h-3" />
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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
  const [showDropdown, setShowDropdown] = useState(false);
  const { t } = useI18n();
  const isExotic = item.rarity === 'exotic';
  const rarityColor = isExotic ? '#E5C76B' : '#7D5C96';

  useEffect(() => {
    if (!showDropdown) return;
    const close = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(`[data-dropdown-id="${item.id}"]`)) setShowDropdown(false);
    };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [showDropdown, item.id]);

  return (
    <div
      className={`group relative bg-gradient-to-b from-white/[0.03] to-transparent border transition-all duration-500 destiny-clip-sm ${
        isInLoadout ? 'opacity-30 grayscale-[70%] border-white/5' : 'border-white/[0.08] hover:border-white/25 item-card-hover'
      }`}
      style={{ overflow: showDropdown ? 'visible' : 'hidden' }}
      data-dropdown-id={item.id}
    >
      <div className="h-[2px] w-full" style={{ backgroundColor: rarityColor }} />
      <div className="aspect-[4/3] relative overflow-hidden bg-black/80 cursor-pointer" onClick={() => setShowDropdown(!showDropdown)}>
        <img src={item.screenshot || item.icon} alt={item.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 brightness-90 group-hover:brightness-110" loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e18] via-transparent to-transparent opacity-90" />
        {showDropdown && <div className="absolute inset-0 bg-indigo-500/[0.06]" />}
      </div>
      <div className="px-2.5 py-2 relative z-10">
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
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 bottom-0 z-30 bg-[#0c1020]/95 backdrop-blur-md border-t border-indigo-500/20 shadow-xl shadow-black/60"
          >
            <div className="py-1">
              <button onClick={() => { onAddToLoadout(); setShowDropdown(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-[9px] uppercase tracking-widest text-[#E5C76B] hover:bg-yellow-500/10 transition-all"
                data-testid={`dropdown-loadout-${item.id}`}>
                <Sparkles className="w-3 h-3" /> {t('action.toLoadout')}
              </button>
              <div className="h-px bg-white/[0.04] mx-2" />
              {characters.map(c => (
                <div key={c.characterId} className="flex items-center">
                  <button onClick={() => { onTransferToChar(c.characterId); setShowDropdown(false); }}
                    className="flex-1 flex items-center gap-2 px-3 py-2 text-[9px] uppercase tracking-widest text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all"
                    data-testid={`dropdown-transfer-${item.id}-${c.characterId}`}>
                    <ArrowRightLeft className="w-3 h-3" /> {c.className}
                  </button>
                  <button onClick={() => { onEquipOnChar(c.characterId); setShowDropdown(false); }}
                    className="px-3 py-2 text-[9px] uppercase tracking-widest text-indigo-400 hover:text-white hover:bg-indigo-500/15 transition-all" title={t('action.equip')}
                    data-testid={`dropdown-equip-${item.id}-${c.characterId}`}>
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
    <div className="flex items-center gap-3 bg-gradient-to-r from-white/[0.03] to-transparent border border-white/[0.06] p-3 hover:border-green-500/20 hover:from-green-500/[0.03] transition-all duration-300 group/quest" data-testid={`card-quest-${quest.id}`}>
      <div className="w-10 h-10 shrink-0 ring-1 ring-white/10 overflow-hidden bg-black group-hover/quest:ring-green-500/20 transition-all">
        {quest.icon && <img src={quest.icon} alt="" className="w-full h-full object-cover" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold truncate tracking-wider uppercase text-white group-hover/quest:text-green-300/90 transition-colors">{quest.name}</p>
        {quest.description && (
          <p className="text-[9px] text-gray-500 truncate mt-0.5">{quest.description}</p>
        )}
        <p className="text-[8px] text-green-500/50 uppercase tracking-widest mt-1">{quest.type || 'Quest'}</p>
      </div>
    </div>
  );
}
