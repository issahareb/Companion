import { useMemo } from 'react';
import type { InventoryItem } from '@/hooks/use-profile-state';
import type { Item } from '@/components/Inventory';

export type TabType = 'characters' | 'vault' | 'loadouts' | 'postmaster' | 'collections' | 'triumphs' | 'season' | 'playstyle';

export interface FilterState {
  search: string;
  slot: string;
  rarity: string;
  minPower: string;
  maxPower: string;
}

export function toItem(inv: InventoryItem): Item {
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

export function useItemFilter(items: InventoryItem[], filters: FilterState): InventoryItem[] {
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
