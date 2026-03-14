import { useRef, useCallback, useMemo } from 'react';
import { Search, Package, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { InventoryItem, CharacterData } from '@/hooks/use-profile-state';
import type { Item, SlotInfo } from '@/components/Inventory';
import { EquippedSlot } from '@/components/Inventory';
import { useI18n } from '@/lib/i18n';
import type { FilterState } from './shared';
import { FilterBar } from './FilterBar';
import { VaultItemCard } from './VaultItemCard';
import { toItem } from './shared';

const appleEase = [0.16, 1, 0.3, 1] as const;

function useColumns() {
  const ref = useRef<HTMLDivElement>(null);
  const getColumns = useCallback(() => {
    if (!ref.current) return 4;
    const w = ref.current.clientWidth;
    if (w >= 1536) return 7;
    if (w >= 1280) return 5;
    if (w >= 640) return 4;
    return 3;
  }, []);
  return { ref, getColumns };
}

interface VaultPanelProps {
  tabDirection: number;
  vaultFilters: FilterState;
  setVaultFilters: (fn: (f: FilterState) => FilterState) => void;
  filteredVaultItems: InventoryItem[];
  characters: CharacterData[];
  loadout: Record<string, Item>;
  addToLoadout: (item: Item) => void;
  unequipItem: (slotId: string) => void;
  handleTransfer: (item: InventoryItem, toVault: boolean, characterId: string) => void;
  handleEquip: (item: InventoryItem, characterId: string) => void;
  setIsSaveModalOpen: (open: boolean) => void;
  ITEM_SLOTS: SlotInfo[];
  SLOT_FILTERS: { id: string; label: string }[];
  RARITY_FILTERS: { id: string; label: string }[];
  pendingItemIds?: Set<string>;
}

export function VaultPanel({
  tabDirection, vaultFilters, setVaultFilters, filteredVaultItems, characters,
  loadout, addToLoadout, unequipItem, handleTransfer, handleEquip,
  setIsSaveModalOpen, ITEM_SLOTS, SLOT_FILTERS, RARITY_FILTERS, pendingItemIds,
}: VaultPanelProps) {
  const { t } = useI18n();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { ref: gridMeasureRef, getColumns } = useColumns();

  const cols = getColumns();
  const rowCount = Math.ceil(filteredVaultItems.length / cols);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 200,
    overscan: 3,
  });

  return (
    <motion.div key="vault" initial={{ opacity: 0, x: tabDirection * 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: tabDirection * -40 }} transition={{ duration: 0.4, ease: appleEase }} className="h-full flex flex-col lg:flex-row">
      <div className="flex-1 flex flex-col min-w-0 border-r border-white/5 min-h-0 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5, ease: appleEase }}
          className="p-4 md:p-6 pb-2 shrink-0 space-y-3"
        >
          <div className="relative group focus-glow rounded-sm">
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
          <FilterBar filters={vaultFilters} onChange={(f) => setVaultFilters(() => f)} slotFilters={SLOT_FILTERS} rarityFilters={RARITY_FILTERS} />
          <p className="text-[10px] text-gray-600 tracking-widest uppercase">{filteredVaultItems.length} Gegenstande</p>
        </motion.div>

        <div ref={(el) => { (scrollRef as any).current = el; (gridMeasureRef as any).current = el; }} className="flex-1 overflow-y-auto p-4 md:p-6 pt-2 scroll-container" data-scroll-container>
          {filteredVaultItems.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: appleEase }}
              className="flex flex-col items-center justify-center h-64 space-y-4"
            >
              <Package className="w-12 h-12 text-gray-700" />
              <p className="text-sm text-gray-500">
                {vaultFilters.search || vaultFilters.slot !== 'all' || vaultFilters.rarity !== 'all'
                  ? t('item.noneAvailable')
                  : t('item.noneAvailable')}
              </p>
            </motion.div>
          ) : (
            <div style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const startIdx = virtualRow.index * cols;
                const rowItems = filteredVaultItems.slice(startIdx, startIdx + cols);
                return (
                  <div
                    key={virtualRow.key}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 gap-2 md:gap-3 pb-2 md:pb-3"
                  >
                    {rowItems.map((item) => (
                      <VaultItemCard
                        key={item.id}
                        item={item}
                        characters={characters}
                        onTransferToChar={(charId) => handleTransfer(item, false, charId)}
                        onEquipOnChar={(charId) => handleEquip(item, charId)}
                        onAddToLoadout={() => addToLoadout(toItem(item))}
                        isInLoadout={loadout[item.slot]?.id === item.id}
                        isPending={pendingItemIds?.has(item.id)}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.6, ease: appleEase }}
        className="hidden lg:flex w-[380px] bg-[#0a0e18]/60 backdrop-blur-sm flex-col shrink-0 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[60px] pointer-events-none animate-breathe" />
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="text-white font-display font-light tracking-[0.2em] flex items-center gap-3 text-xs">
            <Sparkles className="w-4 h-4 text-[#E5C76B]" /> AKTIVES LOADOUT
          </h3>
          <motion.button
            onClick={() => setIsSaveModalOpen(true)}
            disabled={Object.keys(loadout).length === 0}
            className="px-4 py-2 bg-white/5 hover:bg-white text-white hover:text-black transition-all duration-500 disabled:opacity-20 border border-white/10 text-[10px] font-bold tracking-[0.2em] destiny-clip-sm"
            whileTap={{ scale: 0.95 }}
            data-testid="button-save-loadout"
          >
            SPEICHERN
          </motion.button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 space-y-3 scroll-container">
          {ITEM_SLOTS.map((slot, i) => (
            <motion.div
              key={slot.id}
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.05, duration: 0.4, ease: appleEase }}
            >
              <EquippedSlot slotInfo={slot} item={loadout[slot.id]} onUnequip={() => unequipItem(slot.id)} />
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
