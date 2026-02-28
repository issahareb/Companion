import { useState, useMemo } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { api, buildUrl } from '@shared/routes';
import { Loader2, ArrowLeft, Hexagon, Sparkles, Check, AlertTriangle, X, ChevronDown, ArrowRight, Shield, Zap } from 'lucide-react';
import { EquippedSlot, type Item } from '@/components/Inventory';
import { SavedLoadout } from '@shared/schema';
import { useBungieAuth } from '@/hooks/use-bungie-auth';
import { useProfileState, type InventoryItem, type CharacterData } from '@/hooks/use-profile-state';
import { useTransferItem, useEquipItem } from '@/hooks/use-transfer';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/lib/i18n';

const appleEase = [0.16, 1, 0.3, 1] as const;

const ARMOR_SLOTS = ['helmet', 'arms', 'chest', 'legs', 'class'];
const STAT_NAMES = ['Mobility', 'Resilience', 'Recovery', 'Discipline', 'Intellect', 'Strength'];

type MatchStatus = 'exact' | 'substitute' | 'missing';
type ItemSource = 'equipped' | 'inventory' | 'vault' | 'other_character';

interface MatchResult {
  slot: string;
  wanted: Item | null;
  matched: InventoryItem | null;
  status: MatchStatus;
  source?: ItemSource;
  sourceCharId?: string;
  note?: string;
  powerDiff?: number;
}

function bungieIcon(url?: string) {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return `https://www.bungie.net${url}`;
}

export default function SharePage() {
  const [, params] = useRoute('/share/:shareCode');
  const [, setLocation] = useLocation();
  const shareCode = params?.shareCode;
  const { isAuthenticated, destinyProfile, login } = useBungieAuth();
  const { t } = useI18n();

  const { data: profileState, isLoading: isLoadingProfile } = useProfileState(
    destinyProfile?.membershipType,
    destinyProfile?.membershipId,
  );

  const transferItem = useTransferItem();
  const equipItem = useEquipItem();

  const [showEquipModal, setShowEquipModal] = useState(false);
  const [selectedCharId, setSelectedCharId] = useState<string>('');
  const [isEquipping, setIsEquipping] = useState(false);
  const [equipProgress, setEquipProgress] = useState('');

  const ITEM_SLOTS = [
    { id: 'kinetic', label: t('slot.kinetic'), icon: () => null },
    { id: 'energy', label: t('slot.energy'), icon: () => null },
    { id: 'power', label: t('slot.power'), icon: () => null },
    { id: 'helmet', label: t('slot.helmet'), icon: () => null },
    { id: 'arms', label: t('slot.arms'), icon: () => null },
    { id: 'chest', label: t('slot.chest'), icon: () => null },
    { id: 'legs', label: t('slot.legs'), icon: () => null },
    { id: 'class', label: t('slot.class'), icon: () => null },
  ];

  const { data: loadout, isLoading, error } = useQuery<SavedLoadout>({
    queryKey: [buildUrl(api.loadouts.getByShareCode.path, { shareCode: shareCode! })],
    enabled: !!shareCode,
  });

  const characters = profileState?.characters || [];

  const selectedChar = useMemo(() => {
    if (!selectedCharId) return characters[0] || null;
    return characters.find(c => c.characterId === selectedCharId) || characters[0] || null;
  }, [characters, selectedCharId]);

  const matchResults = useMemo<MatchResult[] | null>(() => {
    if (!isAuthenticated || !profileState || !loadout || !selectedChar) return null;

    const loadoutItems = loadout.items as Record<string, Item>;
    const results: MatchResult[] = [];
    const charId = selectedChar.characterId;
    const charInventory = selectedChar.inventory || [];
    const charEquipped = selectedChar.equippedItems || [];
    const vaultItems = profileState.vaultItems || [];
    const otherChars = characters.filter(c => c.characterId !== charId);

    for (const slot of ITEM_SLOTS) {
      const wanted = loadoutItems[slot.id] as Item | undefined;
      if (!wanted) {
        results.push({ slot: slot.id, wanted: null, matched: null, status: 'exact' });
        continue;
      }

      const exactInEquipped = charEquipped.find(i => i.name === wanted.name && i.slot === wanted.slot);
      if (exactInEquipped) {
        results.push({ slot: slot.id, wanted, matched: exactInEquipped, status: 'exact', source: 'equipped' });
        continue;
      }

      const exactInInventory = charInventory.find(i => i.name === wanted.name && i.slot === wanted.slot);
      if (exactInInventory) {
        results.push({ slot: slot.id, wanted, matched: exactInInventory, status: 'exact', source: 'inventory' });
        continue;
      }

      const exactInVault = vaultItems.find(i => i.name === wanted.name && i.slot === wanted.slot);
      if (exactInVault) {
        results.push({ slot: slot.id, wanted, matched: exactInVault, status: 'exact', source: 'vault' });
        continue;
      }

      let exactInOther: InventoryItem | undefined;
      let exactOtherCharId = '';
      for (const oc of otherChars) {
        const found = [...(oc.equippedItems || []), ...(oc.inventory || [])].find(i => i.name === wanted.name && i.slot === wanted.slot);
        if (found) {
          exactInOther = { ...found, characterId: found.characterId || oc.characterId };
          exactOtherCharId = oc.characterId;
          break;
        }
      }
      if (exactInOther) {
        results.push({ slot: slot.id, wanted, matched: exactInOther, status: 'exact', source: 'other_character', sourceCharId: exactOtherCharId });
        continue;
      }

      const allAvailable: { item: InventoryItem; src: ItemSource; srcCharId?: string }[] = [
        ...charInventory.filter(i => i.slot === wanted.slot).map(i => ({ item: i, src: 'inventory' as ItemSource })),
        ...vaultItems.filter(i => i.slot === wanted.slot).map(i => ({ item: i, src: 'vault' as ItemSource })),
      ];
      for (const oc of otherChars) {
        const ocItems = [...(oc.equippedItems || []), ...(oc.inventory || [])].filter(i => i.slot === wanted.slot);
        for (const oi of ocItems) {
          allAvailable.push({ item: { ...oi, characterId: oi.characterId || oc.characterId }, src: 'other_character', srcCharId: oc.characterId });
        }
      }

      const sameRarity = allAvailable.filter(e => e.item.rarity === wanted.rarity);
      const pool = sameRarity.length > 0 ? sameRarity : allAvailable;
      pool.sort((a, b) => b.item.power - a.item.power);
      const best = pool[0];

      if (best) {
        const powerDiff = ARMOR_SLOTS.includes(slot.id) ? best.item.power - (wanted.power || 0) : undefined;
        results.push({
          slot: slot.id, wanted, matched: best.item, status: 'substitute', source: best.src, sourceCharId: best.srcCharId,
          note: `${best.item.name} (${best.item.power})`, powerDiff,
        });
      } else {
        results.push({ slot: slot.id, wanted, matched: null, status: 'missing', note: wanted.name });
      }
    }

    return results;
  }, [isAuthenticated, profileState, loadout, selectedChar, characters]);

  const powerSummary = useMemo(() => {
    if (!matchResults) return null;

    let totalPowerDiff = 0;
    let substitutions = 0;
    let missing = 0;

    for (const r of matchResults) {
      if (!r.wanted) continue;
      if (r.status === 'substitute') {
        substitutions++;
        if (r.powerDiff !== undefined) totalPowerDiff += r.powerDiff;
      }
      if (r.status === 'missing') missing++;
    }

    if (substitutions === 0 && missing === 0) return null;
    return { totalPowerDiff, substitutions, missing };
  }, [matchResults]);

  const needsTransfers = useMemo(() => {
    if (!matchResults) return [];
    return matchResults.filter(r => r.matched && (r.source === 'vault' || r.source === 'other_character'));
  }, [matchResults]);

  const handleEquip = async () => {
    if (!matchResults || !selectedChar || !destinyProfile) return;
    setIsEquipping(true);

    try {
      for (const r of needsTransfers) {
        if (!r.matched) continue;
        setEquipProgress(`${t('share.transferRequired')}: ${r.matched.name}`);

        if (r.source === 'other_character') {
          const srcChar = r.sourceCharId || r.matched.characterId || selectedChar.characterId;
          await transferItem.mutateAsync({
            itemReferenceHash: r.matched.itemHash,
            itemId: r.matched.id,
            characterId: srcChar,
            membershipType: destinyProfile.membershipType,
            transferToVault: true,
          });
          await new Promise(res => setTimeout(res, 300));
        }

        if (r.source === 'vault' || r.source === 'other_character') {
          await transferItem.mutateAsync({
            itemReferenceHash: r.matched.itemHash,
            itemId: r.matched.id,
            characterId: selectedChar.characterId,
            membershipType: destinyProfile.membershipType,
            transferToVault: false,
          });
          await new Promise(res => setTimeout(res, 300));
        }
      }

      const toEquip = matchResults.filter(r => r.matched && r.source !== 'equipped');
      for (const r of toEquip) {
        if (!r.matched) continue;
        setEquipProgress(`${r.matched.name}...`);
        await equipItem.mutateAsync({
          itemId: r.matched.id,
          characterId: selectedChar.characterId,
          membershipType: destinyProfile.membershipType,
        });
        await new Promise(res => setTimeout(res, 250));
      }

      setShowEquipModal(false);
      setEquipProgress('');
    } catch (err: any) {
      setEquipProgress(t('share.equipError'));
    } finally {
      setIsEquipping(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080b14] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !loadout) {
    return (
      <div className="min-h-screen bg-[#080b14] flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-display font-light text-white mb-4 tracking-widest">{t('share.notFound')}</h1>
        <button onClick={() => setLocation('/')} className="text-indigo-400 hover:text-indigo-300 flex items-center gap-2 uppercase tracking-widest text-xs">
          <ArrowLeft className="w-4 h-4" /> {t('action.backToOrbit')}
        </button>
      </div>
    );
  }

  const loadoutItems = loadout.items as Record<string, Item>;

  return (
    <div className="min-h-screen bg-[#080b14] text-gray-300 p-4 md:p-6 flex flex-col items-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(40,40,60,0.3)_0%,_rgba(8,11,20,1)_100%)] z-0" />

      <div className="max-w-2xl w-full z-10 space-y-6">
        <div className="text-center space-y-4 pt-4">
          <Hexagon className="w-10 h-10 mx-auto text-white opacity-80" strokeWidth={1} />
          <h1 className="text-2xl md:text-3xl font-display font-light text-white tracking-[0.3em] uppercase" data-testid="text-loadout-name">{loadout.name}</h1>
          <p className="text-[10px] text-indigo-400 tracking-[0.3em] font-mono uppercase opacity-70">{t('share.config')}</p>
        </div>

        <div className="bg-[#0A0A0C]/60 backdrop-blur-xl border border-white/10 p-5 md:p-8 destiny-clip-sm space-y-4 shadow-2xl">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-4 h-4 text-[#E5C76B]" />
            <h3 className="text-xs font-display font-light tracking-[0.2em] text-white">{t('section.equipment')}</h3>
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
          <div className="space-y-3">
            {characters.length > 1 && (
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-gray-500 uppercase tracking-widest shrink-0">{t('share.selectChar')}</span>
                <div className="flex gap-2 flex-1">
                  {characters.map(c => (
                    <button
                      key={c.characterId}
                      onClick={() => setSelectedCharId(c.characterId)}
                      className={`flex items-center gap-2 px-3 py-2 border text-[10px] tracking-wider uppercase transition-all ${
                        (selectedCharId || characters[0]?.characterId) === c.characterId
                          ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-300'
                          : 'border-white/10 bg-white/[0.02] text-gray-500 hover:border-white/20'
                      }`}
                      data-testid={`button-select-char-${c.characterId}`}
                    >
                      {c.emblemPath && <img src={bungieIcon(c.emblemPath)} alt="" className="w-4 h-4 rounded" />}
                      <span>{c.className}</span>
                      <span className="text-[9px] opacity-60">{c.light}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isLoadingProfile ? (
              <div className="flex items-center justify-center gap-2 py-4 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs">{t('share.searchingInventory')}</span>
              </div>
            ) : matchResults ? (
              <div className="space-y-3">
                <div className="bg-[#0A0A0C]/40 border border-white/[0.06] p-4 space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest">{t('share.statChanges')}</span>
                  </div>
                  {matchResults.filter(r => r.wanted).map(r => {
                    const statusColor = r.status === 'exact' ? 'text-green-400' : r.status === 'substitute' ? 'text-amber-400' : 'text-red-400';
                    const statusBg = r.status === 'exact' ? 'bg-green-500/5 border-green-500/15' : r.status === 'substitute' ? 'bg-amber-500/5 border-amber-500/15' : 'bg-red-500/5 border-red-500/15';
                    return (
                      <div key={r.slot} className={`flex items-center gap-3 p-2 border rounded ${statusBg}`}>
                        <div className="w-7 h-7 shrink-0 border border-white/10 overflow-hidden bg-black rounded-sm">
                          {(r.matched || r.wanted) && (
                            <img src={bungieIcon((r.matched || r.wanted)!.icon)} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[10px] ${statusColor} truncate font-medium`}>
                            {r.status === 'exact' && <span className="inline-flex items-center gap-1"><Check className="w-3 h-3 inline" /> {r.wanted!.name}</span>}
                            {r.status === 'substitute' && r.matched!.name}
                            {r.status === 'missing' && <span className="inline-flex items-center gap-1"><AlertTriangle className="w-3 h-3 inline" /> {r.wanted!.name}</span>}
                          </p>
                          {r.status === 'substitute' && (
                            <p className="text-[9px] text-amber-400/60">
                              {t('share.substitute')} · {r.wanted!.name}
                              {r.powerDiff !== undefined && r.powerDiff !== 0 && (
                                <span className={`ml-1 ${r.powerDiff > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  ({r.powerDiff > 0 ? '+' : ''}{r.powerDiff} PL)
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                        {r.source === 'vault' && (
                          <span className="text-[8px] text-indigo-400/70 bg-indigo-500/10 px-1.5 py-0.5 rounded">{t('share.fromVault')}</span>
                        )}
                        {r.source === 'other_character' && (
                          <span className="text-[8px] text-purple-400/70 bg-purple-500/10 px-1.5 py-0.5 rounded">{t('share.fromChar')}</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {powerSummary && (
                  <div className="bg-[#0A0A0C]/40 border border-white/[0.06] p-3 rounded flex items-center justify-between" data-testid="panel-power-summary">
                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-[#E5C76B]" />
                      <span className="text-[10px] text-gray-400 uppercase tracking-widest">{t('share.totalImpact')}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {powerSummary.totalPowerDiff !== 0 && (
                        <span className={`text-xs font-mono font-medium ${powerSummary.totalPowerDiff > 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {powerSummary.totalPowerDiff > 0 ? '+' : ''}{powerSummary.totalPowerDiff} PL
                        </span>
                      )}
                      <span className="text-[10px] text-amber-400/80">{powerSummary.substitutions} {t('share.substitute').toLowerCase()}</span>
                      {powerSummary.missing > 0 && (
                        <span className="text-[10px] text-red-400/80">{powerSummary.missing} {t('share.missingItem').toLowerCase()}</span>
                      )}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setShowEquipModal(true)}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white transition-all destiny-clip-sm text-[10px] tracking-[0.3em] font-bold uppercase flex items-center justify-center gap-2"
                  data-testid="button-equip-loadout"
                >
                  <Zap className="w-4 h-4" />
                  {t('share.equipNow')}
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            <button
              onClick={login}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white transition-all destiny-clip-sm text-[10px] tracking-[0.3em] font-bold uppercase"
            >
              {t('action.loginToAdopt')}
            </button>
            <button
              onClick={() => setLocation('/')}
              className="w-full py-4 bg-white/5 border border-white/10 hover:border-white/40 text-white transition-all destiny-clip-sm text-[10px] tracking-[0.3em] font-bold uppercase"
            >
              {t('action.createOwn')}
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showEquipModal && matchResults && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => !isEquipping && setShowEquipModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ duration: 0.4, ease: appleEase }}
              onClick={(e) => e.stopPropagation()}
              className="bg-[#141417] border border-white/10 p-6 w-full max-w-lg shadow-2xl max-h-[85vh] overflow-y-auto destiny-clip-sm">

              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-display font-light text-white tracking-wider">{t('share.equipTitle')}</h2>
                  <p className="text-[10px] text-gray-500 mt-1">{t('share.equipDesc')}</p>
                </div>
                {!isEquipping && (
                  <button onClick={() => setShowEquipModal(false)} className="text-gray-500 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {selectedChar && (
                <div className="flex items-center gap-2 mb-4 p-2 bg-white/[0.03] border border-white/[0.06] rounded">
                  {selectedChar.emblemPath && (
                    <img src={bungieIcon(selectedChar.emblemPath)} alt="" className="w-8 h-8 rounded" />
                  )}
                  <div>
                    <p className="text-xs text-white font-medium">{selectedChar.className}</p>
                    <p className="text-[10px] text-gray-500">{selectedChar.light} · {selectedChar.raceName}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2 mb-4">
                {matchResults.filter(r => r.wanted).map(result => {
                  const statusIcon = result.status === 'exact' ? <Check className="w-3 h-3 text-green-400" /> :
                    result.status === 'substitute' ? <ArrowRight className="w-3 h-3 text-amber-400" /> :
                    <AlertTriangle className="w-3 h-3 text-red-400" />;
                  const borderClass = result.status === 'exact' ? 'border-green-500/15' :
                    result.status === 'substitute' ? 'border-amber-500/15' : 'border-red-500/15';

                  return (
                    <div key={result.slot} className={`flex items-center gap-2 p-2 border ${borderClass} rounded bg-black/20`}>
                      {statusIcon}
                      <div className="w-6 h-6 shrink-0 border border-white/10 overflow-hidden bg-black rounded-sm">
                        {(result.matched || result.wanted) && (
                          <img src={bungieIcon((result.matched || result.wanted)!.icon)} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-white truncate">
                          {result.status === 'exact' ? result.wanted!.name : result.status === 'substitute' ? result.matched!.name : result.wanted!.name}
                        </p>
                        <p className="text-[9px] text-gray-500 capitalize">{result.slot}</p>
                      </div>
                      {result.source === 'vault' && <span className="text-[8px] text-indigo-400/70 bg-indigo-500/10 px-1.5 py-0.5 rounded">{t('share.fromVault')}</span>}
                      {result.source === 'other_character' && <span className="text-[8px] text-purple-400/70 bg-purple-500/10 px-1.5 py-0.5 rounded">{t('share.fromChar')}</span>}
                    </div>
                  );
                })}
              </div>

              {needsTransfers.length > 0 && (
                <div className="mb-4 p-2 bg-indigo-500/5 border border-indigo-500/15 rounded">
                  <p className="text-[10px] text-indigo-400">
                    {t('share.transferRequired')} · {needsTransfers.length} {t('ingame.items').toLowerCase()}
                  </p>
                </div>
              )}

              {isEquipping && equipProgress && (
                <div className="mb-4 flex items-center gap-2 p-2 bg-white/[0.03] border border-white/[0.06] rounded">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400 shrink-0" />
                  <p className="text-[10px] text-gray-400 truncate">{equipProgress}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowEquipModal(false)}
                  disabled={isEquipping}
                  className="flex-1 py-3 bg-white/5 border border-white/10 text-white text-[10px] tracking-[0.2em] uppercase font-bold hover:bg-white/10 transition-all disabled:opacity-50"
                >
                  {t('action.cancel')}
                </button>
                <button
                  onClick={handleEquip}
                  disabled={isEquipping}
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] tracking-[0.2em] uppercase font-bold transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                  data-testid="button-confirm-equip"
                >
                  {isEquipping ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('share.equipping')}</>
                  ) : (
                    <><Zap className="w-3.5 h-3.5" /> {t('share.confirm')}</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
