import { useState, useEffect, useMemo } from 'react';
import { 
  Settings, Share2, Search, Crosshair, Menu,
  Zap, Flame, Hexagon, Shield, Check, Archive,
  Sparkles, Activity, Loader2, AlertTriangle, RefreshCw,
  Users, ArrowRightLeft, Trash2, X, Package, Mail,
  ChevronDown, ChevronUp, Filter, SlidersHorizontal, Coins,
  Plus, Sword, ShieldHalf, Orbit, Eye, ScrollText,
  BookOpen, Trophy, TrendingUp, Lock, Unlock, Download, LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import hunterBgImg from '@assets/IMG_0576_1772037013335.jpeg';
import warlockBgImg from '@assets/IMG_0577_1772043445515.jpeg';
import titanBgImg from '@assets/IMG_0673_1772205996067.png';
import ggLogoImg from '@assets/IMG_0608_1772051654559.png';

import { useBungieAuth } from '@/hooks/use-bungie-auth';
import { useLoadouts, useSaveLoadout, useDeleteLoadout } from '@/hooks/use-loadouts';
import { useProfileState, type InventoryItem, type CharacterData, type CurrencyInfo, type QuestItem, type CollectibleItem, type RecordItem, type ProgressionInfo, type SocketInfo, type ArtifactInfo } from '@/hooks/use-profile-state';
import { useTransferItem, useEquipItem, useSwapItem, usePullFromPostmaster, useSetLockState, useEquipItems, useInsertPlug } from '@/hooks/use-transfer';

import { DesktopNavButton, MobileNavButton, UserProfile } from '@/components/Navigation';
import { ItemCard, EquippedSlot, type Item, type SlotInfo } from '@/components/Inventory';
import { SaveLoadoutModal } from '@/components/SaveLoadoutModal';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import { rateWeaponRoll, type RollResult } from '@/lib/roll-ratings';

type TabType = 'characters' | 'vault' | 'loadouts' | 'postmaster' | 'collections' | 'triumphs' | 'season';

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
  const pullPostmasterMutation = usePullFromPostmaster();
  const lockStateMutation = useSetLockState();
  const equipItemsMutation = useEquipItems();
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

  const TAB_ORDER: TabType[] = ['characters', 'vault', 'loadouts', 'postmaster', 'collections', 'triumphs', 'season'];
  const [activeTab, setActiveTabRaw] = useState<TabType>('characters');
  const [tabDirection, setTabDirection] = useState(0);
  const setActiveTab = (newTab: TabType) => {
    const oldIdx = TAB_ORDER.indexOf(activeTab);
    const newIdx = TAB_ORDER.indexOf(newTab);
    setTabDirection(newIdx > oldIdx ? 1 : -1);
    setActiveTabRaw(newTab);
  };
  const [loadout, setLoadout] = useState<Record<string, Item>>({});
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [showMobileLoadout, setShowMobileLoadout] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [vaultFilters, setVaultFilters] = useState<FilterState>({ search: '', slot: 'all', rarity: 'all', minPower: '', maxPower: '' });
  const [slotPickerSlot, setSlotPickerSlot] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [collectionsSearch, setCollectionsSearch] = useState('');
  const [collectionsFilter, setCollectionsFilter] = useState<'all' | 'acquired' | 'notAcquired'>('all');
  const [triumphsSearch, setTriumphsSearch] = useState('');
  const [triumphsFilter, setTriumphsFilter] = useState<'all' | 'completed' | 'incomplete'>('all');

  const characters = profileState?.characters || [];
  const vaultItems = profileState?.vaultItems || [];
  const postmasterItems = profileState?.postmasterItems || [];
  const currencies = profileState?.currencies || [];
  const collectibles = profileState?.collectibles || [];
  const records = profileState?.records || [];

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

  const filteredCollectibles = useMemo(() => {
    return collectibles.filter(c => {
      if (collectionsSearch) {
        const q = collectionsSearch.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !c.description.toLowerCase().includes(q)) return false;
      }
      if (collectionsFilter === 'acquired' && !c.acquired) return false;
      if (collectionsFilter === 'notAcquired' && c.acquired) return false;
      return true;
    });
  }, [collectibles, collectionsSearch, collectionsFilter]);

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (triumphsSearch) {
        const q = triumphsSearch.toLowerCase();
        if (!r.name.toLowerCase().includes(q) && !r.description.toLowerCase().includes(q)) return false;
      }
      if (triumphsFilter === 'completed' && !r.completed) return false;
      if (triumphsFilter === 'incomplete' && r.completed) return false;
      return true;
    });
  }, [records, triumphsSearch, triumphsFilter]);

  const handlePullPostmaster = async (item: InventoryItem) => {
    if (!destinyProfile || !item.characterId) return;
    try {
      await pullPostmasterMutation.mutateAsync({
        itemReferenceHash: item.itemHash,
        itemId: item.id,
        characterId: item.characterId,
        membershipType: destinyProfile.membershipType,
      });
      toast({ title: t('toast.pulled'), description: `${item.name} ${t('toast.pulledDesc')}` });
    } catch (err: any) {
      toast({ title: t('error.generic'), description: err.message, variant: "destructive" });
    }
  };

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
    collections: t('nav.collections'),
    triumphs: t('nav.triumphs'),
    season: t('nav.season'),
  };

  return (
    <div className="h-screen bg-app text-gray-300 font-sans selection:bg-indigo-500/30 flex flex-col md:flex-row overflow-hidden relative">
      <div className="fixed inset-0 pointer-events-none z-0 bg-app-overlay">
        <div className="absolute top-[-15%] left-[-5%] w-[45%] h-[45%] bg-indigo-900/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[40%] h-[40%] bg-purple-900/8 blur-[130px] rounded-full" />
      </div>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden md:flex flex-col w-64 bg-sidebar backdrop-blur-xl border-r border-white/[0.06] shrink-0 z-20 shadow-2xl relative overflow-hidden">
        <div className="p-6 pb-4 relative">
          <div className="flex items-center space-x-3">
            <Hexagon className="w-7 h-7 text-indigo-400" strokeWidth={1.5} />
            <span className="font-display font-light text-base tracking-[0.2em] text-white">GUARDIANGRID <span className="text-[#E5C76B] text-sm">(Adept)</span></span>
          </div>
        </div>

        <nav className="flex-1 py-2 flex flex-col space-y-1.5 px-3">
          <DesktopNavButton icon={Users} label="HÜTER" active={activeTab === 'characters'} onClick={() => setActiveTab('characters')} />
          <DesktopNavButton icon={Package} label="TRESOR" active={activeTab === 'vault'} onClick={() => setActiveTab('vault')} />
          <DesktopNavButton icon={Archive} label="LOADOUTS" active={activeTab === 'loadouts'} onClick={() => setActiveTab('loadouts')} />
          <DesktopNavButton icon={Mail} label="POSTMEISTER" active={activeTab === 'postmaster'} onClick={() => setActiveTab('postmaster')} />
          <div className="h-px bg-white/[0.06] my-2" />
          <DesktopNavButton icon={BookOpen} label={t('nav.collections').toUpperCase()} active={activeTab === 'collections'} onClick={() => setActiveTab('collections')} />
          <DesktopNavButton icon={Trophy} label={t('nav.triumphs').toUpperCase()} active={activeTab === 'triumphs'} onClick={() => setActiveTab('triumphs')} />
          <DesktopNavButton icon={TrendingUp} label={t('nav.season').toUpperCase()} active={activeTab === 'season'} onClick={() => setActiveTab('season')} />
        </nav>
        <UserProfile profile={destinyProfile} onLogout={logout} />
      </aside>

      <main className="flex-1 flex flex-col h-full relative overflow-hidden z-10">
        <header className="h-14 border-b border-white/[0.06] bg-header backdrop-blur-xl flex items-center justify-between px-4 md:px-6 shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 -ml-1 text-white hover:text-indigo-400 transition-colors"
              data-testid="button-menu-toggle"
            >
              <AnimatePresence mode="wait">
                {isMenuOpen ? (
                  <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <X className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                    <Menu className="w-5 h-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </button>
            <div className="md:hidden flex items-center gap-2">
              <img src={ggLogoImg} alt="GG" className="h-5 mix-blend-screen" data-testid="img-gg-logo" />
            </div>
            <h2 className="font-display font-light text-sm tracking-[0.2em] text-white/90 uppercase" data-testid="text-header-title">
              {tabTitles[activeTab]}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {currencies.length > 0 && (
              <div className="hidden sm:flex items-center gap-3">
                {currencies.slice(0, 3).map(c => (
                  <div key={c.itemHash} className="flex items-center gap-1.5" title={c.name}>
                    {c.icon && <img src={c.icon} alt="" className="w-4 h-4 opacity-70" />}
                    <span className="text-[10px] text-gray-400 font-mono">{c.quantity.toLocaleString('de-DE')}</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => refetchProfile()} className="p-2 text-gray-500 hover:text-white transition-all hover:bg-white/5 rounded" data-testid="button-refresh">
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
                    { key: 'guardian', id: 'characters' as TabType, icon: Users, label: t('nav.characters') },
                    { key: 'vault', id: 'vault' as TabType, icon: Package, label: t('nav.vault') },
                    { key: 'loadouts', id: 'loadouts' as TabType, icon: Archive, label: t('nav.loadouts') },
                    { key: 'postmaster', id: 'postmaster' as TabType, icon: Mail, label: t('nav.postmaster') },
                    { key: 'collections', id: 'collections' as TabType, icon: BookOpen, label: t('nav.collections') },
                    { key: 'triumphs', id: 'triumphs' as TabType, icon: Trophy, label: t('nav.triumphs') },
                    { key: 'season', id: 'season' as TabType, icon: TrendingUp, label: t('nav.season') },
                  ].map((item, i) => (
                    <motion.button
                      key={item.key}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 + i * 0.06, duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                      onClick={() => { setActiveTab(item.id); setIsMenuOpen(false); }}
                      className={`w-full flex items-center gap-4 px-4 py-3.5 mb-1 rounded-lg transition-all duration-300 ${
                        activeTab === item.id
                          ? 'bg-white/[0.08] text-white'
                          : 'text-gray-500 hover:text-white hover:bg-white/[0.04]'
                      }`}
                      data-testid={`menu-item-${item.key}`}
                    >
                      <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-indigo-400' : ''}`} />
                      <span className="text-sm font-display tracking-[0.15em] uppercase">{item.label}</span>
                      {activeTab === item.id && (
                        <motion.div
                          layoutId="menu-indicator"
                          className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400"
                        />
                      )}
                    </motion.button>
                  ))}
                </nav>
                <div className="px-3 pb-4 border-t border-white/[0.06] pt-3">
                  <button
                    onClick={() => { setIsMenuOpen(false); logout(); }}
                    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-300"
                    data-testid="menu-item-logout"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm font-display tracking-[0.15em] uppercase">{t('nav.logout')}</span>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className="flex-1 min-h-0 overflow-hidden relative">
          {activeTab === 'characters' && selectedCharacter?.className === 'Hunter' && (
            <>
              <img src={hunterBgImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.25] pointer-events-none z-0" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080b14] via-[#080b14]/50 to-transparent pointer-events-none z-0" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#080b14]/70 via-transparent to-[#080b14]/40 pointer-events-none z-0" />
            </>
          )}
          {activeTab === 'characters' && selectedCharacter?.className === 'Warlock' && (
            <>
              <img src={warlockBgImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.25] pointer-events-none z-0" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080b14] via-[#080b14]/50 to-transparent pointer-events-none z-0" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#080b14]/70 via-transparent to-[#080b14]/40 pointer-events-none z-0" />
            </>
          )}
          {activeTab === 'characters' && selectedCharacter?.className === 'Titan' && (
            <>
              <img src={titanBgImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.25] pointer-events-none z-0" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080b14] via-[#080b14]/50 to-transparent pointer-events-none z-0" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#080b14]/70 via-transparent to-[#080b14]/40 pointer-events-none z-0" />
            </>
          )}
          {isLoadingProfile ? (
            <div className="flex flex-col items-center justify-center h-full space-y-6">
              <div className="w-full max-w-md space-y-4 px-8">
                <div className="h-24 loading-skeleton rounded" />
                <div className="grid grid-cols-3 gap-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-14 loading-skeleton rounded" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 loading-skeleton rounded" style={{ animationDelay: `${i * 0.2}s` }} />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em] font-display">{t('loading.profile')}</p>
              </div>
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
            <AnimatePresence mode="wait" custom={tabDirection}>
              {/* HÜTER TAB */}
              {activeTab === 'characters' && (
                <motion.div
                  key="characters"
                  custom={tabDirection}
                  initial={{ opacity: 0, x: tabDirection * 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: tabDirection * -30 }}
                  transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                  className="h-full flex flex-col relative"
                >
                  <div className="flex items-center gap-1 px-3 md:px-4 pt-3 pb-0 shrink-0 overflow-x-auto">
                    {characters.map(char => (
                      <button
                        key={char.characterId}
                        onClick={() => setSelectedCharacterId(char.characterId)}
                        className={`flex items-center gap-2 px-3 py-2 transition-all duration-200 shrink-0 border-b-2 ${
                          selectedCharacterId === char.characterId
                            ? 'border-indigo-500 text-white'
                            : 'border-transparent text-gray-500 hover:text-white hover:border-white/20'
                        }`}
                        data-testid={`button-select-char-${char.characterId}`}
                      >
                        {char.emblemPath && <img src={char.emblemPath} alt="" className="w-8 h-8 rounded-sm" />}
                        <div className="text-left">
                          <p className="text-[10px] font-bold tracking-wider uppercase">{char.className}</p>
                          <p className="text-[9px] text-gray-500 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5 text-[#E5C76B]" /> {char.light}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="h-px bg-white/[0.06] mx-3 md:mx-4" />

                  {selectedCharacter && (
                    <div className="flex-1 min-h-0 overflow-y-auto">
                      {/* Character header */}
                      <motion.div
                        key={selectedCharacter.characterId}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4 }}
                        className="relative overflow-hidden"
                      >
                        {selectedCharacter.emblemBackgroundPath && (
                          <img src={selectedCharacter.emblemBackgroundPath} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#080b14] via-transparent to-transparent" />
                        <div className="relative z-10 p-5 md:p-7 flex items-center justify-between">
                          <motion.div
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.1, duration: 0.5, ease: 'easeOut' }}
                          >
                            <h3 className="text-2xl md:text-3xl text-white font-display font-light tracking-wider text-shadow-glow">{selectedCharacter.className}</h3>
                            <p className="text-[10px] text-gray-400 uppercase tracking-[0.3em] mt-1">{selectedCharacter.raceName}</p>
                          </motion.div>
                          <motion.div
                            className="flex items-center gap-4"
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.15, duration: 0.5, ease: 'easeOut' }}
                          >
                            {(() => {
                              const subclassItem = selectedCharacter.equippedItems.find(i => i.slot === 'subclass');
                              return subclassItem?.icon ? (
                                <img src={subclassItem.icon} alt={subclassItem.name} title={subclassItem.name} className="w-12 h-12 drop-shadow-[0_0_8px_rgba(100,180,255,0.4)]" data-testid="img-subclass-super" />
                              ) : null;
                            })()}
                            <div className="text-right">
                              <div className="flex items-center gap-2.5 justify-end">
                                <img src="https://www.bungie.net/common/destiny2_content/icons/c81de78390f1b7f2b759c33e9a8b9938.png" alt="Power" className="w-5 h-5 brightness-150 animate-[pulse_3s_ease-in-out_infinite]" />
                                <span className="text-4xl font-display font-light text-[#E5C76B] text-shadow-glow" data-testid="text-power-level">{selectedCharacter.light}</span>
                              </div>
                              <p className="text-[9px] text-gray-400 uppercase tracking-[0.25em] mt-1.5">{t('power.label')}</p>
                            </div>
                          </motion.div>
                        </div>
                      </motion.div>

                      {/* Stats */}
                      {selectedCharacter.stats.length > 0 && (
                        <div className="px-4 md:px-6 pb-5">
                          <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5">
                            {selectedCharacter.stats.map((stat, statIdx) => {
                              const val = stat.value;
                              const pct = Math.min((val / 200) * 100, 100);
                              const isMax = val >= 200;
                              const barColor = isMax ? 'from-[#E5C76B] to-[#D4A843]'
                                : val >= 100 ? 'from-purple-500 to-violet-400'
                                : val >= 60 ? 'from-emerald-600 to-green-400'
                                : val >= 20 ? 'from-yellow-600 to-amber-400'
                                : 'from-red-700 to-red-400';
                              const numColor = isMax ? 'text-[#E5C76B]'
                                : val >= 100 ? 'text-purple-300'
                                : val >= 60 ? 'text-emerald-300'
                                : val >= 20 ? 'text-amber-300'
                                : 'text-red-400';
                              return (
                                <motion.div
                                  key={stat.name}
                                  initial={{ opacity: 0, y: 12 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: 0.2 + statIdx * 0.06, duration: 0.4, ease: 'easeOut' }}
                                  className={`bg-black/30 border p-2 hover:border-white/15 transition-all duration-300 ${isMax ? 'border-[#E5C76B]/25' : 'border-white/[0.06]'}`} title={stat.description}
                                >
                                  <div className="flex items-center gap-1.5 mb-1.5">
                                    {stat.icon && <img src={stat.icon} alt={stat.name} className="w-4 h-4 opacity-70" />}
                                    <p className={`text-[9px] uppercase tracking-[0.12em] truncate flex-1 ${isMax ? 'text-[#E5C76B]/60' : 'text-gray-500'}`}>{stat.name}</p>
                                    <p className={`text-sm font-display font-light leading-none ${numColor}`} data-testid={`text-stat-${stat.name.toLowerCase()}`}>{val}</p>
                                  </div>
                                  <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-500`} style={{ width: `${pct}%` }} />
                                  </div>
                                </motion.div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* WAFFEN Section */}
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3, duration: 0.5, ease: 'easeOut' }}
                        className="px-4 md:px-6 pb-5"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <Crosshair className="w-3.5 h-3.5 text-red-400/70" />
                          <h4 className="text-[10px] text-white/70 uppercase tracking-[0.2em] font-display">{t('section.weapons')}</h4>
                          <div className="flex-1 h-px bg-white/[0.06]" />
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
                      </motion.div>

                      {/* RÜSTUNG Section */}
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45, duration: 0.5, ease: 'easeOut' }}
                        className="px-4 md:px-6 pb-5"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <Shield className="w-3.5 h-3.5 text-blue-400/70" />
                          <h4 className="text-[10px] text-white/70 uppercase tracking-[0.2em] font-display">{t('section.armor')}</h4>
                          <div className="flex-1 h-px bg-white/[0.06]" />
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
                      </motion.div>

                      {/* SUBKLASSE Section */}
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.55, duration: 0.5, ease: 'easeOut' }}
                        className="px-4 md:px-6 pb-5"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <Orbit className="w-3.5 h-3.5 text-purple-400/70" />
                          <h4 className="text-[10px] text-white/70 uppercase tracking-[0.2em] font-display">{t('section.subclass')}</h4>
                          <div className="flex-1 h-px bg-white/[0.06]" />
                        </div>
                        <SubclassEditor
                          character={selectedCharacter}
                          membershipType={destinyProfile!.membershipType}
                        />
                      </motion.div>

                      {/* ARTEFAKT Section */}
                      {profileState?.artifact && (
                        <motion.div
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.65, duration: 0.5, ease: 'easeOut' }}
                          className="px-4 md:px-6 pb-5"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <Hexagon className="w-3.5 h-3.5 text-amber-400/70" />
                            <h4 className="text-[10px] text-white/70 uppercase tracking-[0.2em] font-display">{t('artifact.title')}</h4>
                            <div className="flex-1 h-px bg-white/[0.06]" />
                          </div>
                          <ArtifactDisplay artifact={profileState.artifact} />
                        </motion.div>
                      )}

                      {/* Quests */}
                      {selectedCharacter.quests.length > 0 && (
                        <div className="px-4 md:px-6 pb-6">
                          <div className="flex items-center gap-2 mb-3">
                            <Activity className="w-3.5 h-3.5 text-green-400/70" />
                            <h4 className="text-[10px] text-white/70 uppercase tracking-[0.2em] font-display">Aktive Quests</h4>
                            <span className="text-[9px] text-gray-600">{selectedCharacter.quests.length}</span>
                            <div className="flex-1 h-px bg-white/[0.06]" />
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
                <motion.div key="vault" initial={{ opacity: 0, x: tabDirection * 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: tabDirection * -30 }} transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }} className="h-full flex flex-col lg:flex-row">
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
                      <FilterBar filters={vaultFilters} onChange={setVaultFilters} slotFilters={SLOT_FILTERS} rarityFilters={RARITY_FILTERS} />
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
              )}

              {/* POSTMASTER TAB */}
              {activeTab === 'postmaster' && (
                <motion.div key="postmaster" initial={{ opacity: 0, x: tabDirection * 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: tabDirection * -30 }} transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }} className="h-full overflow-y-auto p-4 md:p-8">
                  {postmasterItems.length === 0 && characters.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500 space-y-6">
                      <Mail className="w-16 h-16 opacity-10" />
                      <p className="font-display tracking-[0.3em] uppercase text-xs">{t('postmaster.empty')}</p>
                      <p className="text-xs text-gray-600 max-w-md text-center">{t('postmaster.emptyDesc')}</p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {[...characters]
                        .sort((a, b) => new Date(b.dateLastPlayed).getTime() - new Date(a.dateLastPlayed).getTime())
                        .map(char => {
                          const charPostItems = postmasterItems.filter(item => item.characterId === char.characterId);
                          return (
                            <div key={char.characterId} data-testid={`section-postmaster-${char.characterId}`}>
                              <div className="flex items-center gap-3 mb-4">
                                <img src={char.emblemPath} alt="" className="w-10 h-10 rounded-sm border border-white/10" />
                                <div>
                                  <h3 className="font-display text-sm tracking-[0.2em] uppercase text-white">{char.className}</h3>
                                  <p className="text-[9px] text-gray-500 tracking-widest uppercase">{charPostItems.length} {t('postmaster.items')}</p>
                                </div>
                              </div>
                              {charPostItems.length === 0 ? (
                                <div className="flex items-center gap-3 py-6 px-4 border border-white/[0.04] bg-white/[0.01] rounded">
                                  <Mail className="w-5 h-5 text-gray-600" />
                                  <p className="text-[10px] text-gray-600 uppercase tracking-widest">{t('postmaster.empty')}</p>
                                </div>
                              ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                  {charPostItems.map(item => (
                                    <div key={item.id} className="bg-gradient-to-b from-amber-500/[0.03] to-transparent border border-amber-500/15 overflow-hidden destiny-clip-sm hover:border-amber-500/30 transition-all duration-300 group" data-testid={`card-postmaster-${item.id}`}>
                                      <div className="h-[2px] w-full bg-amber-500/60" />
                                      <div className="aspect-[4/3] relative overflow-hidden bg-black/80">
                                        <img src={item.screenshot || item.icon} alt={item.name} className="w-full h-full object-cover brightness-90" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e18] via-transparent to-transparent opacity-90" />
                                      </div>
                                      <div className="px-2.5 py-2">
                                        <h4 className="text-[9px] font-bold truncate tracking-wider uppercase text-amber-400">{item.name}</h4>
                                        <p className="text-[8px] text-gray-500 mt-0.5 uppercase tracking-widest">{item.type}</p>
                                        <div className="flex items-center justify-between mt-1">
                                          {item.power > 0 && (
                                            <p className="text-[9px] text-gray-400 flex items-center gap-1">
                                              <Sparkles className="w-2.5 h-2.5 text-[#E5C76B]" /> {item.power}
                                            </p>
                                          )}
                                          <button
                                            onClick={() => handlePullPostmaster(item)}
                                            disabled={pullPostmasterMutation.isPending}
                                            className="flex items-center gap-1 px-2 py-1 text-[8px] uppercase tracking-widest text-amber-400 hover:text-white bg-amber-500/10 hover:bg-amber-500/30 border border-amber-500/20 transition-all opacity-0 group-hover:opacity-100"
                                            data-testid={`button-pull-${item.id}`}
                                          >
                                            <Download className="w-3 h-3" /> {t('action.pullPostmaster')}
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </motion.div>
              )}

              {/* COLLECTIONS TAB */}
              {activeTab === 'collections' && (
                <motion.div key="collections" initial={{ opacity: 0, x: tabDirection * 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: tabDirection * -30 }} transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }} className="h-full flex flex-col">
                  <div className="p-4 md:p-6 pb-2 shrink-0 space-y-3">
                    <div className="relative group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                      <input
                        type="text"
                        placeholder={t('collections.search')}
                        value={collectionsSearch}
                        onChange={(e) => setCollectionsSearch(e.target.value)}
                        className="w-full bg-[#0a0e18]/80 border border-white/[0.08] text-white pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-indigo-500/40 transition-all font-light tracking-wider destiny-clip-sm"
                        data-testid="input-search-collections"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      {(['all', 'acquired', 'notAcquired'] as const).map(f => (
                        <button
                          key={f}
                          onClick={() => setCollectionsFilter(f)}
                          className={`px-3 py-1.5 text-[9px] uppercase tracking-widest border transition-all ${
                            collectionsFilter === f
                              ? 'bg-indigo-600/30 border-indigo-500/50 text-white'
                              : 'bg-white/5 border-white/5 text-gray-500 hover:text-white'
                          }`}
                          data-testid={`filter-collections-${f}`}
                        >
                          {f === 'all' ? t('collections.all') : f === 'acquired' ? t('collections.acquired') : t('collections.notAcquired')}
                        </button>
                      ))}
                      <span className="text-[10px] text-gray-600 ml-2">
                        {filteredCollectibles.filter(c => c.acquired).length}/{filteredCollectibles.length} {t('collections.acquired').toLowerCase()}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 md:p-6 pt-2">
                    {filteredCollectibles.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 space-y-4">
                        <BookOpen className="w-12 h-12 text-gray-700" />
                        <p className="text-sm text-gray-500">{t('item.noneAvailable')}</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2">
                        {filteredCollectibles.slice(0, 200).map(c => (
                          <div
                            key={c.collectibleHash}
                            className={`group relative border transition-all duration-300 destiny-clip-sm ${
                              c.acquired
                                ? 'bg-gradient-to-b from-white/[0.04] to-transparent border-white/[0.08] hover:border-indigo-500/30'
                                : 'bg-black/40 border-white/[0.04] opacity-40 grayscale hover:opacity-70'
                            }`}
                            data-testid={`collectible-${c.collectibleHash}`}
                          >
                            <div className={`h-[2px] w-full ${c.acquired ? 'bg-indigo-500/60' : 'bg-gray-700/40'}`} />
                            <div className="aspect-square relative overflow-hidden bg-black/60 flex items-center justify-center p-2">
                              {c.icon ? (
                                <img src={c.icon} alt={c.name} className="w-full h-full object-contain" loading="lazy" />
                              ) : (
                                <BookOpen className="w-8 h-8 text-gray-700" />
                              )}
                              {c.acquired && (
                                <div className="absolute top-1 right-1 w-4 h-4 bg-green-500/80 rounded-full flex items-center justify-center">
                                  <Check className="w-2.5 h-2.5 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="px-2 py-1.5">
                              <p className="text-[8px] font-bold truncate tracking-wider uppercase text-white">{c.name}</p>
                              {c.sourceString && (
                                <p className="text-[8px] text-gray-600 truncate mt-0.5">{c.sourceString}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* TRIUMPHS TAB */}
              {activeTab === 'triumphs' && (
                <motion.div key="triumphs" initial={{ opacity: 0, x: tabDirection * 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: tabDirection * -30 }} transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }} className="h-full flex flex-col">
                  <div className="p-4 md:p-6 pb-2 shrink-0 space-y-3">
                    <div className="relative group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                      <input
                        type="text"
                        placeholder={t('triumphs.search')}
                        value={triumphsSearch}
                        onChange={(e) => setTriumphsSearch(e.target.value)}
                        className="w-full bg-[#0a0e18]/80 border border-white/[0.08] text-white pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-indigo-500/40 transition-all font-light tracking-wider destiny-clip-sm"
                        data-testid="input-search-triumphs"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      {(['all', 'completed', 'incomplete'] as const).map(f => (
                        <button
                          key={f}
                          onClick={() => setTriumphsFilter(f)}
                          className={`px-3 py-1.5 text-[9px] uppercase tracking-widest border transition-all ${
                            triumphsFilter === f
                              ? 'bg-indigo-600/30 border-indigo-500/50 text-white'
                              : 'bg-white/5 border-white/5 text-gray-500 hover:text-white'
                          }`}
                          data-testid={`filter-triumphs-${f}`}
                        >
                          {f === 'all' ? t('triumphs.all') : f === 'completed' ? t('triumphs.completed') : t('triumphs.incomplete')}
                        </button>
                      ))}
                      <span className="text-[10px] text-gray-600 ml-2">
                        {t('triumphs.score')}: {filteredRecords.filter(r => r.completed).reduce((sum, r) => sum + r.scoreValue, 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 md:p-6 pt-2">
                    {filteredRecords.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 space-y-4">
                        <Trophy className="w-12 h-12 text-gray-700" />
                        <p className="text-sm text-gray-500">{t('item.noneAvailable')}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredRecords.slice(0, 100).map(record => (
                          <div
                            key={record.recordHash}
                            className={`border transition-all duration-300 p-3 ${
                              record.completed
                                ? 'bg-gradient-to-r from-[#E5C76B]/[0.06] to-transparent border-[#E5C76B]/20 hover:border-[#E5C76B]/40'
                                : 'bg-gradient-to-r from-white/[0.02] to-transparent border-white/[0.06] hover:border-white/15'
                            }`}
                            data-testid={`record-${record.recordHash}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-10 h-10 shrink-0 flex items-center justify-center overflow-hidden ring-1 ${
                                record.completed ? 'ring-[#E5C76B]/30' : 'ring-white/10'
                              }`}>
                                {record.icon ? (
                                  <img src={record.icon} alt="" className="w-full h-full object-cover" loading="lazy" />
                                ) : (
                                  <Trophy className={`w-5 h-5 ${record.completed ? 'text-[#E5C76B]' : 'text-gray-600'}`} />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className={`text-[10px] font-bold tracking-wider uppercase truncate ${
                                    record.completed ? 'text-[#E5C76B]' : 'text-white'
                                  }`}>{record.name}</h4>
                                  {record.completed && (
                                    <div className="shrink-0 w-4 h-4 bg-green-500/80 rounded-full flex items-center justify-center">
                                      <Check className="w-2.5 h-2.5 text-white" />
                                    </div>
                                  )}
                                  {record.scoreValue > 0 && (
                                    <span className="text-[8px] text-[#E5C76B]/60 shrink-0">{record.scoreValue} pts</span>
                                  )}
                                </div>
                                {record.description && (
                                  <p className="text-[9px] text-gray-500 mt-0.5 line-clamp-2">{record.description}</p>
                                )}
                                {record.objectives.length > 0 && !record.completed && (
                                  <div className="mt-2 space-y-1.5">
                                    {record.objectives.map((obj, i) => {
                                      const pct = obj.completionValue > 0 ? Math.min(100, (obj.progress / obj.completionValue) * 100) : 0;
                                      return (
                                        <div key={i}>
                                          <div className="flex items-center justify-between mb-0.5">
                                            <span className="text-[8px] text-gray-500 truncate flex-1">{obj.description || t('triumphs.progress')}</span>
                                            <span className="text-[8px] text-gray-400 shrink-0 ml-2">
                                              {obj.progress.toLocaleString()}/{obj.completionValue.toLocaleString()}
                                            </span>
                                          </div>
                                          <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                                            <div
                                              className={`h-full rounded-full transition-all duration-500 ${
                                                obj.complete ? 'bg-green-500' : 'bg-indigo-500'
                                              }`}
                                              style={{ width: `${pct}%` }}
                                            />
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* SEASON TAB */}
              {activeTab === 'season' && (
                <motion.div key="season" initial={{ opacity: 0, x: tabDirection * 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: tabDirection * -30 }} transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }} className="h-full overflow-y-auto p-4 md:p-8">
                  {selectedCharacter ? (
                    <div className="space-y-6">
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <TrendingUp className="w-3.5 h-3.5 text-indigo-400/70" />
                          <h4 className="text-[10px] text-white/70 uppercase tracking-[0.2em] font-display">{t('season.progressions')}</h4>
                          <div className="flex-1 h-px bg-white/[0.06]" />
                        </div>
                        {(selectedCharacter.progressions || []).length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-32 text-gray-600">
                            <TrendingUp className="w-8 h-8 opacity-20 mb-2" />
                            <p className="text-[10px] uppercase tracking-widest">{t('item.noneAvailable')}</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {selectedCharacter.progressions.slice(0, 30).map(prog => {
                              const pct = prog.nextLevelAt > 0 ? Math.min(100, (prog.progressToNextLevel / prog.nextLevelAt) * 100) : 100;
                              return (
                                <div
                                  key={prog.progressionHash}
                                  className="bg-gradient-to-r from-white/[0.03] to-transparent border border-white/[0.06] p-3 hover:border-indigo-500/20 transition-all duration-300"
                                  data-testid={`progression-${prog.progressionHash}`}
                                >
                                  <div className="flex items-center gap-3 mb-2">
                                    {prog.icon ? (
                                      <img src={prog.icon} alt="" className="w-8 h-8 ring-1 ring-white/10" />
                                    ) : (
                                      <div className="w-8 h-8 bg-indigo-500/10 flex items-center justify-center ring-1 ring-white/10">
                                        <TrendingUp className="w-4 h-4 text-indigo-400/50" />
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[10px] font-bold truncate tracking-wider uppercase text-white">{prog.name}</p>
                                      <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[9px] text-indigo-400">{t('season.level')} {prog.level}</span>
                                        {prog.currentResetCount > 0 && (
                                          <span className="text-[8px] text-[#E5C76B]">{t('season.resets')}: {prog.currentResetCount}</span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                  <p className="text-[8px] text-gray-600 mt-1 text-right">
                                    {prog.progressToNextLevel.toLocaleString()}/{prog.nextLevelAt > 0 ? prog.nextLevelAt.toLocaleString() : '—'}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500 space-y-4">
                      <TrendingUp className="w-12 h-12 opacity-10" />
                      <p className="text-sm">{t('item.noneAvailable')}</p>
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

function FilterBar({ filters, onChange, slotFilters, rarityFilters }: { filters: FilterState; onChange: (f: FilterState) => void; slotFilters: { id: string; label: string }[]; rarityFilters: { id: string; label: string }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1 overflow-x-auto">
        {slotFilters.map(sf => (
          <button key={sf.id} onClick={() => onChange({ ...filters, slot: sf.id })}
            className={`px-2.5 py-1 text-[9px] uppercase tracking-widest border transition-all shrink-0 ${
              filters.slot === sf.id ? 'bg-indigo-600/30 border-indigo-500/50 text-white' : 'bg-white/5 border-white/5 text-gray-500 hover:text-white'
            }`} data-testid={`filter-slot-${sf.id}`}>
            {sf.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1">
        {rarityFilters.map(rf => (
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

function SubclassEditor({ character, membershipType }: { character: CharacterData; membershipType: number }) {
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

function ArtifactDisplay({ artifact }: { artifact: ArtifactInfo }) {
  const { t } = useI18n();
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 p-3 bg-black/40 border border-white/[0.06]">
        {artifact.icon && <img src={artifact.icon} alt={artifact.name} className="w-12 h-12 shrink-0 ring-1 ring-amber-500/20 rounded-sm" />}
        <div className="flex-1">
          <p className="text-[11px] font-bold tracking-wider uppercase text-amber-300">{artifact.name}</p>
          <div className="flex items-center gap-3 mt-0.5">
            {artifact.powerBonus > 0 && (
              <span className="text-[9px] text-yellow-500/80 flex items-center gap-0.5 font-medium">
                <Sparkles className="w-2.5 h-2.5" /> +{artifact.powerBonus} {t('artifact.powerBonus')}
              </span>
            )}
            <span className="text-[8px] text-gray-500">{t('artifact.points')}: {artifact.pointsUsed}/{artifact.pointsAvailable}</span>
          </div>
        </div>
      </div>

      {artifact.tiers.map((tier, tierIdx) => {
        const activeItems = tier.items.filter(i => i.isActive);
        if (activeItems.length === 0) return null;
        return (
          <div key={tierIdx} className="space-y-1">
            <p className="text-[8px] text-gray-500 uppercase tracking-[0.25em] font-medium px-1">{t('artifact.tier')} {tierIdx + 1}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
              {activeItems.map((item) => (
                <div key={item.itemHash} className="flex items-center gap-2 p-2 bg-amber-500/[0.04] border border-amber-500/10">
                  {item.icon && <img src={item.icon} alt={item.name} className="w-7 h-7 rounded-sm ring-1 ring-amber-500/20 shrink-0" />}
                  <p className="text-[9px] text-amber-200/80 font-medium truncate">{item.name}</p>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RollRatingBadge({ result }: { result: RollResult }) {
  const { t } = useI18n();
  const { rating, sPerks, aPerks } = result;

  const badgeStyle = rating === 'META'
    ? 'bg-gradient-to-r from-[#E5C76B]/20 to-[#D4A843]/20 border-[#E5C76B]/40 text-[#E5C76B] shadow-[0_0_8px_rgba(229,199,107,0.25)]'
    : rating === 'GOOD'
    ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
    : 'bg-white/5 border-white/10 text-gray-500';

  const label = rating === 'META' ? t('roll.meta') : rating === 'GOOD' ? t('roll.good') : t('roll.mid');

  return (
    <div className="group/roll relative">
      <span
        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider border rounded-sm ${badgeStyle}`}
        data-testid={`badge-roll-${rating.toLowerCase()}`}
      >
        {rating === 'META' && <Sparkles className="w-2.5 h-2.5" />}
        {label}
      </span>
      {(sPerks.length > 0 || aPerks.length > 0) && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/roll:block z-50 pointer-events-none">
          <div className="bg-black/95 border border-white/10 rounded px-2.5 py-2 min-w-[140px] max-w-[220px]">
            {sPerks.length > 0 && (
              <div className="mb-1">
                <p className="text-[8px] text-[#E5C76B]/70 uppercase tracking-widest mb-0.5">{t('roll.sPerks')}</p>
                {sPerks.map(p => <p key={p} className="text-[8px] text-[#E5C76B]">{p}</p>)}
              </div>
            )}
            {aPerks.length > 0 && (
              <div>
                <p className="text-[8px] text-purple-400/70 uppercase tracking-widest mb-0.5">{t('roll.aPerks')}</p>
                {aPerks.map(p => <p key={p} className="text-[8px] text-purple-300">{p}</p>)}
              </div>
            )}
          </div>
        </div>
      )}
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
  const isWeaponSlot = ['kinetic', 'energy', 'power'].includes(slotId);

  const rollResult = useMemo(() => {
    if (!item || !isWeaponSlot) return null;
    const perkNames = [
      ...(item.perks || []).filter(p => p.isActive).map(p => p.name),
      ...(item.mods || []).map(m => m.name),
    ];
    if (perkNames.length === 0) return null;
    return rateWeaponRoll(item.type, perkNames);
  }, [item, isWeaponSlot]);

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
                {rollResult && <RollRatingBadge result={rollResult} />}
              </div>
              {item.mods && item.mods.length > 0 && (
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  {item.mods.slice(0, 8).map((mod, i) => (
                    mod.icon ? (
                      <div key={i} className="group/perk relative">
                        <img src={mod.icon} alt={mod.name} className="w-5 h-5 rounded-sm ring-1 ring-white/10 hover:ring-indigo-500/40 hover:scale-110 transition-all cursor-help duration-200" />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/perk:block z-50 pointer-events-none">
                          <div className="bg-black/95 border border-white/10 rounded px-2 py-1 min-w-[120px] max-w-[200px]">
                            <p className="text-[9px] text-white font-bold whitespace-nowrap">{mod.name}</p>
                            {mod.description && <p className="text-[8px] text-gray-400 mt-0.5 line-clamp-3">{mod.description}</p>}
                          </div>
                        </div>
                      </div>
                    ) : null
                  ))}
                </div>
              )}
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
                            <span className="text-[8px] text-gray-600 uppercase">{invItem.type}</span>
                            {fromVault && <span className="text-[8px] text-indigo-400/70 uppercase">{t('vault.label')}</span>}
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
  const isWeapon = ['kinetic', 'energy', 'power'].includes(item.slot);

  const rollResult = useMemo(() => {
    if (!isWeapon) return null;
    const perkNames = [
      ...(item.perks || []).filter(p => p.isActive).map(p => p.name),
      ...(item.mods || []).map(m => m.name),
    ];
    if (perkNames.length === 0) return null;
    return rateWeaponRoll(item.type, perkNames);
  }, [item, isWeapon]);

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
        isInLoadout
          ? 'opacity-30 grayscale-[70%] border-white/5'
          : isExotic
            ? 'border-[#E5C76B]/20 hover:border-[#E5C76B]/40 rarity-exotic-glow item-card-hover'
            : 'border-white/[0.08] hover:border-white/25 item-card-hover'
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
          <div className="flex items-center gap-1.5 min-w-0">
            <p className="text-[8px] text-gray-500 uppercase tracking-widest truncate">{item.type}</p>
            {rollResult && <RollRatingBadge result={rollResult} />}
          </div>
          {item.power > 0 && (
            <p className="text-[8px] text-gray-400 flex items-center gap-0.5 shrink-0">
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
