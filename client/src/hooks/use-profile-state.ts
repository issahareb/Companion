import { useQuery } from '@tanstack/react-query';

export interface PerkInfo {
  perkHash: number;
  name: string;
  icon: string;
  description: string;
  isActive: boolean;
}

export interface ModInfo {
  plugHash: number;
  name: string;
  icon: string;
  description: string;
}

export interface SocketPlugOption {
  plugHash: number;
  name: string;
  icon: string;
  description: string;
}

export interface SocketInfo {
  socketIndex: number;
  plugHash: number;
  name: string;
  icon: string;
  description: string;
  isEnabled: boolean;
  reusablePlugs: SocketPlugOption[];
}

export interface ArtifactTierItem {
  itemHash: number;
  name: string;
  icon: string;
  isActive: boolean;
}

export interface ArtifactInfo {
  artifactHash: number;
  name: string;
  icon: string;
  powerBonus: number;
  pointsUsed: number;
  pointsAvailable: number;
  tiers: { tierHash: number; items: ArtifactTierItem[] }[];
}

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
  perks?: PerkInfo[];
  mods?: ModInfo[];
  sockets?: SocketInfo[];
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

export interface CollectibleItem {
  collectibleHash: number;
  name: string;
  icon: string;
  description: string;
  acquired: boolean;
  sourceString: string;
}

export interface RecordItem {
  recordHash: number;
  name: string;
  icon: string;
  description: string;
  completed: boolean;
  objectives: { description: string; progress: number; completionValue: number; complete: boolean }[];
  scoreValue: number;
}

export interface ProgressionInfo {
  progressionHash: number;
  name: string;
  icon: string;
  level: number;
  currentProgress: number;
  nextLevelAt: number;
  progressToNextLevel: number;
  dailyProgress: number;
  currentResetCount: number;
}

export interface RecentActivity {
  activityHash: number;
  activityName: string;
  mode: string;
  date: string;
  values: Record<string, number>;
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
  progressions: ProgressionInfo[];
}

export interface ProfileState {
  characters: CharacterData[];
  vaultItems: InventoryItem[];
  postmasterItems: InventoryItem[];
  currencies: CurrencyInfo[];
  collectibles: CollectibleItem[];
  records: RecordItem[];
  artifact?: ArtifactInfo;
}

export function useProfileState(membershipType?: number, membershipId?: string) {
  return useQuery<ProfileState>({
    queryKey: ['/api/bungie/profile-state', membershipType, membershipId],
    queryFn: async () => {
      const accessToken = localStorage.getItem('bungie_access_token');
      if (!accessToken || !membershipType || !membershipId) {
        return { characters: [], vaultItems: [], postmasterItems: [], currencies: [], collectibles: [], records: [], artifact: undefined };
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
