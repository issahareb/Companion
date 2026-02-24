import { useQuery } from '@tanstack/react-query';

export interface InventoryItem {
  id: string;
  itemHash: number;
  name: string;
  type: string;
  slot: string;
  screenshot: string;
  rarity: string;
  power: number;
  icon: string;
  location: 'vault' | 'character' | 'equipped' | 'postmaster';
  characterId?: string;
  description?: string;
  classType?: number;
}

export interface QuestItem {
  id: string;
  itemHash: number;
  name: string;
  icon: string;
  description: string;
  type: string;
}

export interface CurrencyInfo {
  itemHash: number;
  name: string;
  icon: string;
  quantity: number;
}

export interface CharacterData {
  characterId: string;
  classType: number;
  className: string;
  raceName: string;
  light: number;
  emblemPath: string;
  emblemBackgroundPath: string;
  dateLastPlayed: string;
  stats: Record<string, number>;
  equippedItems: InventoryItem[];
  inventory: InventoryItem[];
  quests: QuestItem[];
}

export interface ProfileState {
  characters: CharacterData[];
  vaultItems: InventoryItem[];
  postmasterItems: InventoryItem[];
  currencies: CurrencyInfo[];
}

export function useProfileState(membershipType?: number, membershipId?: string) {
  return useQuery<ProfileState>({
    queryKey: ['/api/bungie/profile-state', membershipType, membershipId],
    queryFn: async () => {
      const accessToken = localStorage.getItem('bungie_access_token');
      if (!accessToken || !membershipType || !membershipId) {
        return { characters: [], vaultItems: [], postmasterItems: [], currencies: [] };
      }

      const res = await fetch(
        `/api/bungie/profile-state/${membershipType}/${membershipId}`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(error.message || 'Failed to fetch profile state');
      }

      return res.json();
    },
    enabled: !!membershipType && !!membershipId,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
}
