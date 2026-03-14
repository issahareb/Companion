import { useState, useMemo } from 'react';
import {
  Search, Sparkles, ArrowRightLeft, ChevronUp, Plus, Package, Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { InventoryItem, CharacterData } from '@/hooks/use-profile-state';
import { useI18n } from '@/lib/i18n';
import { rateWeaponRoll, type RollResult } from '@/lib/roll-ratings';
import { TierStars } from './TierStars';

function getRarityBg(rarity: string): string {
  switch (rarity) {
    case 'exotic': return 'bg-gradient-to-br from-[#ceae33]/30 via-[#ceae33]/10 to-[#ceae33]/5';
    case 'legendary': return 'bg-gradient-to-br from-[#522f65]/40 via-[#522f65]/15 to-[#522f65]/5';
    case 'rare': return 'bg-gradient-to-br from-[#5076a3]/30 via-[#5076a3]/10 to-transparent';
    default: return 'bg-gradient-to-br from-white/[0.06] via-white/[0.02] to-transparent';
  }
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

export { RollRatingBadge };

export function EquippedSlotRow({ slotId, slotLabel, SlotIcon, item, isExpanded, onTogglePicker, onAddToLoadout, character, vaultItems, onEquip, onAddToLoadoutItem, isPending }: {
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
  isPending?: boolean;
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

        <div className={`w-12 h-12 shrink-0 overflow-hidden relative flex items-center justify-center rounded-lg transition-all duration-300 ${
          item ? getRarityBg(item.rarity) : ''
        } ${isExpanded ? 'ring-1 ring-indigo-500/40' : 'ring-1 ring-white/10'}`}>
          {item ? (
            <>
              <div className="absolute top-0 left-0 w-full h-[2px] z-10" style={{ backgroundColor: rarityColor }} />
              {(item.icon || item.screenshot) ? (
                <img src={item.icon || item.screenshot} alt={item.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : (
                <Package className="w-5 h-5 text-gray-600" />
              )}
              {isPending && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-[2px] rounded-lg">
                  <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                </div>
              )}
              <div className="absolute bottom-0.5 left-0.5 z-10">
                <TierStars rarity={item.rarity} size="xs" />
              </div>
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
                        <div className={`w-9 h-9 shrink-0 overflow-hidden relative rounded ${getRarityBg(invItem.rarity)} ${isItemExotic ? 'ring-1 ring-yellow-500/20' : 'ring-1 ring-white/10'}`}>
                          {(invItem.icon || invItem.screenshot) ? (
                            <img src={invItem.icon || invItem.screenshot} alt={invItem.name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Package className="w-4 h-4 text-gray-600" /></div>
                          )}
                          <div className="absolute bottom-0 left-0 z-10">
                            <TierStars rarity={invItem.rarity} size="xs" />
                          </div>
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
