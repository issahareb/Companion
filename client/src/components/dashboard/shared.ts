import { useMemo, useDeferredValue } from 'react';
import type { InventoryItem } from '@/hooks/use-profile-state';
import type { Item } from '@/components/Inventory';

export const appleEase = [0.16, 1, 0.3, 1] as const;

export const springSnappy = { type: 'spring' as const, damping: 25, stiffness: 300 };
export const springGentle = { type: 'spring' as const, damping: 25, stiffness: 120 };
export const springMedium = { type: 'spring' as const, damping: 30, stiffness: 200 };

export type TabType = 'characters' | 'vault' | 'loadouts' | 'postmaster' | 'collections' | 'triumphs' | 'season' | 'activity' | 'ai' | 'news';

export type AiSubTab = 'playstyle' | 'build' | 'roll' | 'triumph' | 'synergy';

export interface FilterState {
  search: string;
  slot: string;
  rarity: string;
  minPower: string;
  maxPower: string;
}

export function toItem(inv: InventoryItem): Item {
  const item: Item = {
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

  if (inv.perks && inv.perks.length > 0) {
    item.perks = inv.perks.filter(p => p.name).map(p => ({
      perkHash: p.perkHash,
      name: p.name,
      icon: p.icon,
      isActive: p.isActive,
    }));
  }

  if (inv.mods && inv.mods.length > 0) {
    item.mods = inv.mods.filter(m => m.name).map(m => ({
      plugHash: m.plugHash,
      name: m.name,
      icon: m.icon,
    }));
  }

  if (inv.stats && inv.stats.length > 0) {
    item.stats = inv.stats.map(s => ({
      statHash: s.statHash,
      name: s.name,
      value: s.value,
    }));
  }

  if (inv.sockets && inv.sockets.length > 0 && inv.slot === 'subclass') {
    const SOCKET_CATS: Record<number, string> = {
      0: 'super', 1: 'classAbility', 2: 'movement', 3: 'melee', 4: 'grenade',
      5: 'aspect', 6: 'aspect', 7: 'fragment', 8: 'fragment', 9: 'fragment', 10: 'fragment', 11: 'fragment',
    };
    item.sockets = inv.sockets.filter(s => s.name).map(s => ({
      socketIndex: s.socketIndex,
      plugHash: s.plugHash,
      name: s.name,
      icon: s.icon,
      description: s.description,
      category: SOCKET_CATS[s.socketIndex] || 'other',
    }));
  }

  return item;
}

export function useItemFilter(items: InventoryItem[], filters: FilterState): InventoryItem[] {
  const deferredFilters = useDeferredValue(filters);
  return useMemo(() => {
    return items.filter(item => {
      if (deferredFilters.search) {
        const q = deferredFilters.search.toLowerCase();
        if (!item.name.toLowerCase().includes(q) && !item.type.toLowerCase().includes(q)) return false;
      }
      if (deferredFilters.slot !== 'all' && item.slot !== deferredFilters.slot) return false;
      if (deferredFilters.rarity !== 'all' && item.rarity !== deferredFilters.rarity) return false;
      if (deferredFilters.minPower && item.power < parseInt(deferredFilters.minPower)) return false;
      if (deferredFilters.maxPower && item.power > parseInt(deferredFilters.maxPower)) return false;
      return true;
    });
  }, [items, deferredFilters]);
}
