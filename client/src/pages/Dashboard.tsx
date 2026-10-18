import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  Hexagon, Loader2, AlertTriangle, RefreshCw,
  Users, X, Package, Mail,
  Sparkles,
  BookOpen, Trophy, TrendingUp, LogOut,
  ServerCrash, Clock, Menu, Archive, Brain, Newspaper,
  PanelLeftClose, PanelLeft, Swords,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import hunterBgImg from '@assets/IMG_0576_1772037013335.jpeg';
import warlockBgImg from '@assets/IMG_0577_1772043445515.jpeg';
import titanBgImg from '@assets/IMG_0673_1772205996067.png';
import ggLogoImg from '@assets/IMG_0608_1772051654559.png';

import { useBungieAuth } from '@/hooks/use-bungie-auth';
import { useLoadouts, useSaveLoadout, useDeleteLoadout } from '@/hooks/use-loadouts';
import { useProfileState, getBungieErrorType, type InventoryItem } from '@/hooks/use-profile-state';
import { useTransferItem, useEquipItem, useSwapItem, usePullFromPostmaster, useSetLockState, useEquipItems, useIsBungieMutating, useProfileTabSync } from '@/hooks/use-transfer';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { ErrorBoundary } from '@/components/ErrorBoundary';

import { DesktopNavButton, UserProfile } from '@/components/Navigation';
import { type Item, type SlotInfo, EquippedSlot } from '@/components/Inventory';
import { SaveLoadoutModal } from '@/components/SaveLoadoutModal';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import { Crosshair, Zap, Flame, Shield } from 'lucide-react';
import { Orbit } from 'lucide-react';

import { type TabType, type AiSubTab, type FilterState, toItem, useItemFilter } from '@/components/dashboard/shared';
import { BungieAutoRetry, OfflineBanner } from '@/components/dashboard/BungieStatus';
import { CharacterPanel } from '@/components/dashboard/CharacterPanel';
import { VaultPanel } from '@/components/dashboard/VaultPanel';
import { LoadoutsPanel } from '@/components/dashboard/LoadoutsPanel';
import { PostmasterPanel } from '@/components/dashboard/PostmasterPanel';
const CollectionsPanel = lazy(() => import('@/components/dashboard/CollectionsPanel').then(m => ({ default: m.CollectionsPanel })));
const TriumphsPanel = lazy(() => import('@/components/dashboard/TriumphsPanel').then(m => ({ default: m.TriumphsPanel })));
const SeasonPanel = lazy(() => import('@/components/dashboard/SeasonPanel').then(m => ({ default: m.SeasonPanel })));
const PlaystylePanel = lazy(() => import('@/components/dashboard/PlaystylePanel').then(m => ({ default: m.PlaystylePanel })));
const BuildAdvisorPanel = lazy(() => import('@/components/dashboard/BuildAdvisorPanel').then(m => ({ default: m.BuildAdvisorPanel })));
const WeaponRollPanel = lazy(() => import('@/components/dashboard/WeaponRollPanel').then(m => ({ default: m.WeaponRollPanel })));
const TriumphAdvisorPanel = lazy(() => import('@/components/dashboard/TriumphAdvisorPanel').then(m => ({ default: m.TriumphAdvisorPanel })));
const NewsPanel = lazy(() => import('@/components/dashboard/NewsPanel').then(m => ({ default: m.NewsPanel })));
const SynergyPanel = lazy(() => import('@/components/dashboard/SynergyPanel'));
const RaidReportPanel = lazy(() => import('@/components/dashboard/RaidReportPanel').then(m => ({ default: m.RaidReportPanel })));
const AiUsageBanner = lazy(() => import('@/components/dashboard/AiUsageBanner').then(m => ({ default: m.AiUsageBanner })));
const PremiumSidebarBadge = lazy(() => import('@/components/dashboard/AiUsageBanner').then(m => ({ default: m.PremiumSidebarBadge })));

function LazyTabLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
    </div>
  );
}

export default function Dashboard() {
  const { destinyProfile, logout, isAuthenticated, isFetchingProfile } = useBungieAuth();
  const [, navigate] = useLocation();
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
  const isBungieMutating = useIsBungieMutating();
  const isOnline = useOnlineStatus();
  const { toast } = useToast();
  const { t } = useI18n();
  const bungieErrorType = getBungieErrorType(profileError);

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

  const TAB_ORDER: TabType[] = ['characters', 'vault', 'loadouts', 'postmaster', 'collections', 'triumphs', 'season', 'activity', 'ai', 'news'];
  const [activeTab, setActiveTabRaw] = useState<TabType>(() => {
    try {
      const saved = sessionStorage.getItem('gg_active_tab') as TabType | null;
      return saved && TAB_ORDER.includes(saved) ? saved : 'characters';
    } catch { return 'characters'; }
  });
  const [aiSubTab, setAiSubTab] = useState<AiSubTab>('playstyle');
  const [tabDirection, setTabDirection] = useState(0);
  const setActiveTab = (newTab: TabType) => {
    if (newTab === activeTab) return;
    const oldIdx = TAB_ORDER.indexOf(activeTab);
    const newIdx = TAB_ORDER.indexOf(newTab);
    setTabDirection(newIdx > oldIdx ? 1 : -1);
    setActiveTabRaw(newTab);
    try { sessionStorage.setItem('gg_active_tab', newTab); } catch {}
  };
  const [loadout, setLoadout] = useState<Record<string, Item>>({});
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [showMobileLoadout, setShowMobileLoadout] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [vaultFilters, setVaultFilters] = useState<FilterState>({ search: '', slot: 'all', rarity: 'all', minPower: '', maxPower: '' });
  const [slotPickerSlot, setSlotPickerSlot] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  useEffect(() => {
    if (!isMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isMenuOpen]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [pendingItemIds, setPendingItemIds] = useState<Set<string>>(new Set());
  const [collectionsSearch, setCollectionsSearch] = useState('');
  const [collectionsFilter, setCollectionsFilter] = useState<'all' | 'acquired' | 'notAcquired'>('all');
  const [triumphsSearch, setTriumphsSearch] = useState('');
  const [triumphsFilter, setTriumphsFilter] = useState<'all' | 'completed' | 'incomplete'>('all');

  useProfileTabSync();
  useEffect(() => {
    if (!isFetchingProfile && (!isAuthenticated || !destinyProfile)) navigate('/');
  }, [isFetchingProfile, isAuthenticated, destinyProfile, navigate]);

  const characters = profileState?.characters || [];
  const vaultItems = profileState?.vaultItems || [];
  const postmasterItems = profileState?.postmasterItems || [];
  const currencies = profileState?.currencies || [];
  const collectibles = profileState?.collectibles || [];
  const records = profileState?.records || [];

  const selectedCharacter = characters.find(c => c.characterId === selectedCharacterId) || null;

  useEffect(() => {
    if (characters.length > 0 && !characters.some(c => c.characterId === selectedCharacterId)) {
      setSelectedCharacterId(characters[0].characterId);
    }
  }, [characters, selectedCharacterId]);

  useEffect(() => {
    const raw = localStorage.getItem('pending_loadout');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const MAX_AGE = 24 * 60 * 60 * 1000;
        if (parsed?.timestamp && Date.now() - parsed.timestamp > MAX_AGE) {
          localStorage.removeItem('pending_loadout');
          return;
        }
        const data = parsed?.data || parsed;
        setLoadout(data);
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
    if (!destinyProfile || !item.characterId || isBungieMutating || !isOnline) return;
    setPendingItemIds(prev => new Set(prev).add(item.id));
    try {
      await pullPostmasterMutation.mutateAsync({
        itemReferenceHash: item.itemHash,
        itemId: item.isInstanced ? item.id : "0",
        characterId: item.characterId,
        membershipType: destinyProfile.membershipType,
      });
      toast({ title: t('toast.pulled'), description: `${item.name} ${t('toast.pulledDesc')}` });
    } catch (err: any) {
      toast({ title: t('error.generic'), description: err.message, variant: "destructive" });
    } finally {
      setPendingItemIds(prev => { const n = new Set(prev); n.delete(item.id); return n; });
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
    await saveLoadoutMutation.mutateAsync({ bungieMembershipId: destinyProfile.membershipId, name, items: loadout as any });
    toast({ title: t('toast.saved'), description: `"${name}" ${t('toast.savedDesc')}` });
    setActiveTab('loadouts');
  };

  const handleDeleteLoadout = async (id: number) => {
    if (!destinyProfile?.membershipId) return;
    await deleteLoadoutMutation.mutateAsync({ id, bungieMembershipId: destinyProfile.membershipId });
    toast({ title: t('toast.deleted') });
  };

  const handleTransfer = async (item: InventoryItem, toVault: boolean, characterId: string) => {
    if (!destinyProfile || isBungieMutating || !isOnline) return;
    setPendingItemIds(prev => new Set(prev).add(item.id));
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
    } finally {
      setPendingItemIds(prev => { const n = new Set(prev); n.delete(item.id); return n; });
    }
  };

  const handleEquip = async (item: InventoryItem, characterId: string) => {
    if (isBungieMutating || !isOnline) return;
    if (!destinyProfile) return;
    setPendingItemIds(prev => new Set(prev).add(item.id));
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
    } finally {
      setPendingItemIds(prev => { const n = new Set(prev); n.delete(item.id); return n; });
    }
  };

  const copyToClipboard = (code: string) => {
    const link = `${window.location.origin}/share/${code}`;
    navigator.clipboard.writeText(link)
      .then(() => toast({ title: t('toast.linkCopied') }))
      .catch(() => toast({ title: t('error.generic'), description: link, variant: 'destructive' }));
  };

  const tabTitles: Record<TabType, string> = {
    characters: t('nav.characters'),
    vault: t('nav.vault'),
    loadouts: t('nav.loadouts'),
    postmaster: t('nav.postmaster'),
    collections: t('nav.collections'),
    triumphs: t('nav.triumphs'),
    season: t('nav.season'),
    activity: t('nav.activity'),
    ai: t('nav.playstyle'),
    news: t('nav.news'),
  };

  if (isFetchingProfile) {
    return (
      <div className="h-screen bg-app flex items-center justify-center" data-testid="dashboard-loading">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          <p className="text-gray-400 text-sm">{t('loading.profile')}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !destinyProfile) return null;

  return (
    <div className="gg-dashboard h-screen bg-app text-gray-300 font-sans selection:bg-indigo-500/30 flex flex-col md:flex-row overflow-hidden relative">
      <div className="fixed inset-0 pointer-events-none z-0 bg-app-overlay">
        <div className="absolute top-[-15%] left-[-5%] w-[45%] h-[45%] bg-indigo-900/10 blur-[150px] rounded-full" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[40%] h-[40%] bg-purple-900/8 blur-[130px] rounded-full" />
      </div>

      {/* DESKTOP SIDEBAR */}
      <aside className={`hidden md:flex flex-col ${sidebarCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'} gg-sidebar bg-sidebar glass border-r border-white/[0.06] shrink-0 z-20 shadow-2xl relative overflow-hidden`}>
        <div className={`${sidebarCollapsed ? 'p-3 pb-2' : 'px-5 pt-6 pb-5'} relative`}>
          <div className={`gg-brand-lockup ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="gg-brand-symbol"><Hexagon className="w-5 h-5" strokeWidth={1.6} /></div>
            {!sidebarCollapsed && (
              <div className="min-w-0">
                <span className="font-display text-[15px] leading-tight tracking-wide text-white block">GUARDIANGRID</span>
                <span className="block font-mono text-[10px] mt-0.5 tracking-[.22em] text-[var(--gg-muted)] uppercase">Adept · Companion</span>
              </div>
            )}
          </div>
        </div>

        <nav aria-label="GuardianGrid sections" className={`flex-1 min-h-0 overflow-y-auto scroll-container py-2 flex flex-col gap-0.5 ${sidebarCollapsed ? 'px-1.5' : 'px-3'}`}>
          <DesktopNavButton icon={Users} label="HÜTER" active={activeTab === 'characters'} onClick={() => setActiveTab('characters')} collapsed={sidebarCollapsed} />
          <DesktopNavButton icon={Package} label="TRESOR" active={activeTab === 'vault'} onClick={() => setActiveTab('vault')} collapsed={sidebarCollapsed} />
          <DesktopNavButton icon={Archive} label="LOADOUTS" active={activeTab === 'loadouts'} onClick={() => setActiveTab('loadouts')} collapsed={sidebarCollapsed} />
          <DesktopNavButton icon={Mail} label="POSTMEISTER" active={activeTab === 'postmaster'} onClick={() => setActiveTab('postmaster')} collapsed={sidebarCollapsed} />
          {sidebarCollapsed ? <div className="h-px bg-white/[0.06] my-2" /> : <span className="gg-sidebar-divider">DISCOVER</span>}
          <DesktopNavButton icon={BookOpen} label={t('nav.collections').toUpperCase()} active={activeTab === 'collections'} onClick={() => setActiveTab('collections')} collapsed={sidebarCollapsed} />
          <DesktopNavButton icon={Trophy} label={t('nav.triumphs').toUpperCase()} active={activeTab === 'triumphs'} onClick={() => setActiveTab('triumphs')} collapsed={sidebarCollapsed} />
          <DesktopNavButton icon={TrendingUp} label={t('nav.season').toUpperCase()} active={activeTab === 'season'} onClick={() => setActiveTab('season')} collapsed={sidebarCollapsed} />
          <DesktopNavButton icon={Swords} label={t('nav.activity').toUpperCase()} active={activeTab === 'activity'} onClick={() => setActiveTab('activity')} collapsed={sidebarCollapsed} />
          {sidebarCollapsed ? <div className="h-px bg-white/[0.06] my-2" /> : <span className="gg-sidebar-divider">INTELLIGENCE</span>}
          <DesktopNavButton icon={Brain} label={t('nav.playstyle').toUpperCase()} active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} collapsed={sidebarCollapsed} />
          <DesktopNavButton icon={Newspaper} label={t('nav.news').toUpperCase()} active={activeTab === 'news'} onClick={() => setActiveTab('news')} collapsed={sidebarCollapsed} />
        </nav>

        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="mx-3 mb-2 p-2 text-gray-500 hover:text-white transition-colors rounded hover:bg-white/[0.04] flex items-center justify-center"
          title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          data-testid="button-sidebar-collapse"
        >
          {sidebarCollapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
        </button>

        <Suspense fallback={null}>
          <div className={`${sidebarCollapsed ? 'px-1.5 flex justify-center' : 'px-3'} mb-2`}>
            <PremiumSidebarBadge />
          </div>
        </Suspense>
        {sidebarCollapsed
          ? <button onClick={logout} title={t('nav.logout')} aria-label={t('nav.logout')} className="mx-auto mb-4 p-3 rounded-lg hover:bg-red-500/10 text-gray-400 hover:text-red-400"><LogOut className="h-4 w-4" /></button>
          : <UserProfile profile={destinyProfile} onLogout={logout} />}
      </aside>

      <main className="flex-1 flex flex-col h-full relative overflow-hidden z-10">
        <header className="gg-dashboard-header border-b border-white/[0.06] bg-header backdrop-blur-xl flex items-center justify-between px-4 md:px-7 shrink-0 z-10 header-border-glow">
          <div className="flex items-center gap-3">
            <div className="md:hidden flex items-center gap-2">
              <img src={ggLogoImg} alt="GG" className="h-5 mix-blend-screen" data-testid="img-gg-logo" />
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="gg-page-eyebrow hidden sm:block">GUARDIANGRID / GUARDIAN OPERATIONS</span>
              <h1 className="gg-page-title" data-testid="text-header-title">{tabTitles[activeTab]}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="gg-status-chip hidden lg:inline-flex">{isOnline ? 'Online' : 'Offline'}</span>
            {currencies.length > 0 && (
              <div className="hidden sm:flex items-center gap-3">
                {currencies.slice(0, 3).map(c => (
                  <div key={c.itemHash} className="flex items-center gap-1.5" title={c.name}>
                    {c.icon && <img src={c.icon} alt="" className="w-4 h-4 opacity-70" />}
                    <span className="text-[11px] text-gray-400 font-mono">{c.quantity.toLocaleString('de-DE')}</span>
                  </div>
                ))}
              </div>
            )}
            <motion.button
              onClick={() => refetchProfile()}
              className="p-2 text-gray-500 hover:text-white transition-all hover:bg-white/5 rounded icon-bounce-hover"
              aria-label="Refresh profile data"
              data-testid="button-refresh"
              whileTap={{ rotate: 180 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <RefreshCw className={`w-4 h-4 ${isFetchingProfile ? 'animate-spin' : ''}`} />
            </motion.button>
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
                role="dialog" aria-modal="true" aria-label="GuardianGrid navigation"
                className="gg-mobile-sheet fixed top-0 left-0 bottom-0 w-72 bg-[#0a0e1a]/98 backdrop-blur-2xl border-r border-white/[0.08] z-40 flex flex-col"
              >
                <div className="p-6 pb-4 border-b border-white/[0.06]">
                  <div className="flex items-center justify-between">
                    <span className="font-display text-lg tracking-destiny text-white">GUARDIANGRID <span className="text-[var(--color-gold-accent)] text-sm">(Adept)</span></span>
                    <button onClick={() => setIsMenuOpen(false)} aria-label="Close navigation" className="p-1.5 text-gray-500 hover:text-white transition-colors">
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
                    { key: 'activity', id: 'activity' as TabType, icon: Swords, label: t('nav.activity') },
                    { key: 'ai', id: 'ai' as TabType, icon: Brain, label: t('nav.playstyle') },
                    { key: 'news', id: 'news' as TabType, icon: Newspaper, label: t('nav.news') },
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
                      <span className="text-sm font-display tracking-destiny uppercase">{item.label}</span>
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
                    <span className="text-sm font-display tracking-destiny uppercase">{t('nav.logout')}</span>
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {!isOnline && <OfflineBanner />}
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
                <p className="text-[11px] text-gray-500 uppercase tracking-destiny-widest font-display">{t('loading.profile')}</p>
              </div>
            </div>
          ) : profileError ? (
            <div className="flex flex-col items-center justify-center h-full space-y-4">
              {bungieErrorType === 'maintenance' ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <ServerCrash className="w-8 h-8 text-amber-400" />
                  </div>
                  <h3 className="text-base font-semibold text-white/90" data-testid="text-bungie-maintenance">Bungie API Maintenance</h3>
                  <p className="text-sm text-gray-400 text-center max-w-md">
                    Bungie's servers are currently undergoing maintenance. Your data will load automatically when they're back online.
                  </p>
                  <BungieAutoRetry onRetry={() => refetchProfile()} />
                </>
              ) : bungieErrorType === 'rate_limit' ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center">
                    <Clock className="w-8 h-8 text-orange-400" />
                  </div>
                  <h3 className="text-base font-semibold text-white/90" data-testid="text-bungie-throttled">Rate Limited</h3>
                  <p className="text-sm text-gray-400 text-center max-w-md">
                    Too many requests to Bungie's API. Please wait a moment before trying again.
                  </p>
                  <BungieAutoRetry onRetry={() => refetchProfile()} intervalSeconds={15} />
                </>
              ) : (
                <>
                  <AlertTriangle className="w-8 h-8 text-amber-500" />
                  <p className="text-sm text-gray-400 text-center max-w-md">{t('error.profile')}</p>
                  <button onClick={() => refetchProfile()} className="flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all destiny-clip-sm" data-testid="button-retry-profile">
                    <RefreshCw className="w-3.5 h-3.5" /> {t('error.retry')}
                  </button>
                </>
              )}
            </div>
          ) : (
            <AnimatePresence mode="wait" custom={tabDirection}>
              {activeTab === 'characters' && (
                <CharacterPanel
                  characters={characters}
                  selectedCharacterId={selectedCharacterId}
                  setSelectedCharacterId={setSelectedCharacterId}
                  selectedCharacter={selectedCharacter}
                  tabDirection={tabDirection}
                  slotPickerSlot={slotPickerSlot}
                  setSlotPickerSlot={setSlotPickerSlot}
                  addToLoadout={addToLoadout}
                  handleEquip={handleEquip}
                  vaultItems={vaultItems}
                  artifact={profileState?.artifact}
                  membershipType={destinyProfile!.membershipType}
                  pendingItemIds={pendingItemIds}
                />
              )}

              {activeTab === 'vault' && (
                <VaultPanel
                  tabDirection={tabDirection}
                  vaultFilters={vaultFilters}
                  setVaultFilters={setVaultFilters}
                  filteredVaultItems={filteredVaultItems}
                  characters={characters}
                  loadout={loadout}
                  addToLoadout={addToLoadout}
                  unequipItem={unequipItem}
                  handleTransfer={handleTransfer}
                  handleEquip={handleEquip}
                  setIsSaveModalOpen={setIsSaveModalOpen}
                  ITEM_SLOTS={ITEM_SLOTS}
                  SLOT_FILTERS={SLOT_FILTERS}
                  RARITY_FILTERS={RARITY_FILTERS}
                  pendingItemIds={pendingItemIds}
                />
              )}

              {activeTab === 'loadouts' && (
                <LoadoutsPanel
                  tabDirection={tabDirection}
                  isLoadingLoadouts={isLoadingLoadouts}
                  savedLoadouts={savedLoadouts}
                  copyToClipboard={copyToClipboard}
                  setLoadout={setLoadout}
                  setActiveTab={setActiveTab}
                  handleDeleteLoadout={handleDeleteLoadout}
                  toast={toast}
                  inGameLoadouts={profileState?.inGameLoadouts || {}}
                  characters={characters}
                />
              )}

              {activeTab === 'postmaster' && (
                <PostmasterPanel
                  tabDirection={tabDirection}
                  characters={characters}
                  postmasterItems={postmasterItems}
                  handlePullPostmaster={handlePullPostmaster}
                  isPullPending={pullPostmasterMutation.isPending}
                  pendingItemIds={pendingItemIds}
                />
              )}

              {activeTab === 'collections' && (
                <Suspense fallback={<LazyTabLoader />}>
                <CollectionsPanel
                  tabDirection={tabDirection}
                  collectionsSearch={collectionsSearch}
                  setCollectionsSearch={setCollectionsSearch}
                  collectionsFilter={collectionsFilter}
                  setCollectionsFilter={setCollectionsFilter}
                  filteredCollectibles={filteredCollectibles}
                />
                </Suspense>
              )}

              {activeTab === 'triumphs' && (
                <Suspense fallback={<LazyTabLoader />}>
                <TriumphsPanel
                  tabDirection={tabDirection}
                  triumphsSearch={triumphsSearch}
                  setTriumphsSearch={setTriumphsSearch}
                  triumphsFilter={triumphsFilter}
                  setTriumphsFilter={setTriumphsFilter}
                  filteredRecords={filteredRecords}
                />
                </Suspense>
              )}

              {activeTab === 'season' && (
                <Suspense fallback={<LazyTabLoader />}>
                <SeasonPanel
                  tabDirection={tabDirection}
                  selectedCharacter={selectedCharacter}
                />
                </Suspense>
              )}

              {activeTab === 'activity' && (
                <Suspense fallback={<LazyTabLoader />}>
                <RaidReportPanel
                  tabDirection={tabDirection}
                  membershipType={destinyProfile?.membershipType}
                  membershipId={destinyProfile?.membershipId}
                  characterIds={characters.map(c => c.characterId)}
                />
                </Suspense>
              )}

              {activeTab === 'ai' && (
                <motion.div
                  key="ai-hub"
                  initial={{ opacity: 0, x: tabDirection * 60 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: tabDirection * -60 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="h-full flex flex-col ai-section-badge"
                >
                  <Suspense fallback={null}>
                    <div className="mt-4">
                      <AiUsageBanner />
                    </div>
                  </Suspense>
                  <div className="flex items-center gap-1 p-1 bg-white/[0.03] border border-white/[0.06] rounded-lg shrink-0 mx-4 md:mx-8 mb-4 overflow-x-auto scrollbar-hide" data-testid="ai-subtab-bar">
                    {([
                      { id: 'playstyle' as AiSubTab, label: t('advisor.playstyle') },
                      { id: 'build' as AiSubTab, label: t('advisor.buildRec') },
                      { id: 'roll' as AiSubTab, label: t('advisor.weaponRoll') },
                      { id: 'triumph' as AiSubTab, label: t('advisor.triumphAdvisor') },
                      { id: 'synergy' as AiSubTab, label: t('advisor.synergy') },
                    ] as const).map(sub => (
                      <button
                        key={sub.id}
                        onClick={() => setAiSubTab(sub.id)}
                        className={`px-3 py-1.5 text-[11px] font-display tracking-destiny uppercase transition-all rounded-md whitespace-nowrap shrink-0 ${
                          aiSubTab === sub.id
                            ? 'bg-white/[0.08] text-white border border-white/[0.1]'
                            : 'text-gray-500 hover:text-gray-300'
                        }`}
                        data-testid={`button-ai-subtab-${sub.id}`}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex-1 min-h-0 overflow-hidden">
                  <Suspense fallback={<LazyTabLoader />}>
                  <AnimatePresence mode="wait">
                    {!selectedCharacter && aiSubTab !== 'roll' && (
                      <motion.div
                        key="ai-no-char"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center"
                      >
                        <div className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                          <Users className="w-7 h-7 text-gray-500" />
                        </div>
                        <p className="text-sm text-gray-500 max-w-xs" data-testid="text-ai-no-character">{t('advisor.noCharacter')}</p>
                      </motion.div>
                    )}
                    {(selectedCharacter || aiSubTab === 'roll') && aiSubTab === 'playstyle' && (
                      <PlaystylePanel
                        key="playstyle-sub"
                        tabDirection={0}
                        selectedCharacter={selectedCharacter}
                        artifact={profileState?.artifact}
                      />
                    )}
                    {(selectedCharacter || aiSubTab === 'roll') && aiSubTab === 'build' && (
                      <BuildAdvisorPanel
                        key="build-sub"
                        tabDirection={0}
                        selectedCharacter={selectedCharacter}
                        vaultItems={profileState?.vaultItems || []}
                        artifact={profileState?.artifact}
                      />
                    )}
                    {aiSubTab === 'roll' && (
                      <WeaponRollPanel
                        key="roll-sub"
                        tabDirection={0}
                        vaultItems={profileState?.vaultItems || []}
                        characterItems={selectedCharacter?.inventory || []}
                      />
                    )}
                    {(selectedCharacter || aiSubTab === 'roll') && aiSubTab === 'triumph' && (
                      <TriumphAdvisorPanel
                        key="triumph-sub"
                        tabDirection={0}
                        selectedCharacter={selectedCharacter}
                        records={profileState?.records || []}
                      />
                    )}
                    {(selectedCharacter || aiSubTab === 'roll') && aiSubTab === 'synergy' && (
                      <SynergyPanel
                        key="synergy-sub"
                        tabDirection={0}
                        selectedCharacter={selectedCharacter}
                      />
                    )}
                  </AnimatePresence>
                  </Suspense>
                  </div>
                </motion.div>
              )}

              {activeTab === 'news' && (
                <Suspense fallback={<LazyTabLoader />}>
                <NewsPanel tabDirection={tabDirection} />
                </Suspense>
              )}
            </AnimatePresence>
          )}
        </div>
      </main>

      {(activeTab === 'vault' || activeTab === 'characters') && (
        <button onClick={() => setShowMobileLoadout(true)}
          aria-label="Open active loadout"
          className="gg-loadout-fab lg:hidden fixed bottom-24 md:bottom-20 right-4 z-30 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-900/50 transition-all"
          data-testid="button-mobile-loadout">
          <Sparkles className="w-5 h-5" />
          {Object.keys(loadout).length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--color-gold-accent)] text-black text-[11px] font-bold rounded-full flex items-center justify-center">
              {Object.keys(loadout).length}
            </span>
          )}
        </button>
      )}

      <AnimatePresence>
        {showMobileLoadout && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm" onClick={() => setShowMobileLoadout(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              role="dialog" aria-modal="true" aria-label="Active loadout"
               className="absolute inset-0 sm:top-auto sm:max-h-[85vh] bg-[#0a0e18] border-t border-white/[0.08] sm:rounded-t-2xl flex flex-col"
              style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-center pt-3 pb-1">
                <div className="w-10 h-1 bg-white/20 rounded-full" />
              </div>
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-white font-display font-light tracking-destiny-wide flex items-center gap-3 text-sm">
                  <Sparkles className="w-4 h-4 text-[var(--color-gold-accent)]" /> AKTIVES LOADOUT
                </h3>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setShowMobileLoadout(false); setIsSaveModalOpen(true); }} disabled={Object.keys(loadout).length === 0}
                    className="px-4 py-2 bg-white/5 hover:bg-white text-white hover:text-black transition-all disabled:opacity-20 border border-white/10 text-[11px] font-bold tracking-destiny-wide destiny-clip-sm uppercase">
                    SPEICHERN
                  </button>
                  <button onClick={() => setShowMobileLoadout(false)} aria-label="Close loadout" className="p-2 text-gray-400 hover:text-white">
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

      <SaveLoadoutModal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} onSave={handleSaveLoadout} />

      <nav aria-label="Primary navigation" className="gg-mobile-bottom md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#080b14]/95 backdrop-blur-xl border-t border-white/[0.08] mobile-bottom-tabs" data-testid="mobile-bottom-tabs">
        <div className="flex items-stretch justify-around">
          {([
            { id: 'characters' as TabType, icon: Users, label: t('nav.characters').split('-')[0].split(' ')[0] },
            { id: 'vault' as TabType, icon: Package, label: t('nav.vault') },
            { id: 'loadouts' as TabType, icon: Archive, label: 'Loadouts' },
            { id: 'postmaster' as TabType, icon: Mail, label: t('nav.postmaster').slice(0, 8) },
          ]).map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 flex-1 transition-colors ${
                activeTab === item.id ? 'text-indigo-400' : 'text-gray-600'
              }`}
              data-testid={`bottom-tab-${item.id}`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[11px] tracking-destiny uppercase font-display">{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => setIsMenuOpen(true)}
            className={`flex flex-col items-center justify-center gap-0.5 py-2 px-3 flex-1 transition-colors ${
              !['characters', 'vault', 'loadouts', 'postmaster'].includes(activeTab) ? 'text-indigo-400' : 'text-gray-600'
            }`}
            data-testid="bottom-tab-more"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[11px] tracking-destiny uppercase font-display">Mehr</span>
          </button>
        </div>
        <div className="flex items-center justify-center gap-3 pb-1">
          <Link href="/imprint"><span className="text-[11px] tracking-destiny uppercase text-gray-500 hover:text-gray-300 transition-colors cursor-pointer" data-testid="link-dashboard-imprint">{t('footer.imprint')}</span></Link>
          <span className="text-gray-600 text-[11px]">|</span>
          <Link href="/privacy"><span className="text-[11px] tracking-destiny uppercase text-gray-500 hover:text-gray-300 transition-colors cursor-pointer" data-testid="link-dashboard-privacy">{t('footer.privacy')}</span></Link>
        </div>
      </nav>

      <div className="hidden md:block fixed bottom-0 left-0 right-0 z-50 bg-[#080b14]/90 glass-subtle border-t border-white/[0.04] py-2 px-4">
        <div className="flex items-center justify-center gap-3">
          <Link href="/imprint"><span className="text-[11px] tracking-destiny uppercase text-gray-500 hover:text-gray-300 transition-colors cursor-pointer" data-testid="link-desktop-imprint">{t('footer.imprint')}</span></Link>
          <span className="text-gray-600 text-[11px]">|</span>
          <Link href="/privacy"><span className="text-[11px] tracking-destiny uppercase text-gray-500 hover:text-gray-300 transition-colors cursor-pointer" data-testid="link-desktop-privacy">{t('footer.privacy')}</span></Link>
        </div>
      </div>
    </div>
  );
}
