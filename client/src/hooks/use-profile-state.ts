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
  isInstanced?: boolean;
  stats?: { statHash: number; name: string; value: number }[];
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
  stats: { name: string; value: number; icon: string; description: string; }[];
  equippedItems: InventoryItem[];
  inventory: InventoryItem[];
  quests: QuestItem[];
  progressions: ProgressionInfo[];
}

export interface ItemStatValue {
  statHash: number;
  name: string;
  value: number;
}

export interface InGameLoadoutItem {
  itemInstanceId: string;
  itemHash: number;
  name: string;
  icon: string;
  slot: string;
  rarity: string;
  power: number;
  stats: ItemStatValue[];
  perks: { perkHash: number; name: string; icon: string; isActive: boolean }[];
  mods: { plugHash: number; name: string; icon: string }[];
}

export interface InGameLoadout {
  index: number;
  nameHash: number;
  colorHash: number;
  iconHash: number;
  name: string;
  icon: string;
  colorImagePath: string;
  items: InGameLoadoutItem[];
}

export interface ProfileState {
  characters: CharacterData[];
  vaultItems: InventoryItem[];
  postmasterItems: InventoryItem[];
  currencies: CurrencyInfo[];
  collectibles: CollectibleItem[];
  records: RecordItem[];
  artifact?: ArtifactInfo;
  inGameLoadouts: Record<string, InGameLoadout[]>;
}

export type BungieErrorType = 'rate_limit' | 'maintenance' | 'auth' | 'timeout' | 'network' | 'api' | null;

export function getBungieErrorType(error: unknown): BungieErrorType {
  if (!error || typeof error !== 'object') return null;
  return (error as any).errorType || null;
}

export function useProfileState(membershipType?: number, membershipId?: string) {
  return useQuery<ProfileState>({
    queryKey: ['/api/bungie/profile-state', membershipType, membershipId],
    queryFn: async ({ signal }) => {
      if (!membershipType || !membershipId) {
        return { characters: [], vaultItems: [], postmasterItems: [], currencies: [], collectibles: [], records: [], artifact: undefined, inGameLoadouts: {} };
      }

      const res = await fetch(
        `/api/bungie/profile-state/${membershipType}/${membershipId}`,
        {
          credentials: 'include',
          signal,
        }
      );

      if (!res.ok) {
        let errorData: any;
        try {
          errorData = await res.json();
        } catch {
          errorData = { message: 'Unknown error' };
        }
        const error = new Error(errorData.message || 'Failed to fetch profile state');
        (error as any).status = res.status;
        (error as any).errorType = errorData.errorType || null;
        (error as any).errorCode = errorData.errorCode || 0;
        throw error;
      }

      return res.json();
    },
    enabled: !!membershipType && !!membershipId,
    staleTime: 2 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: false,
    retry: (failureCount, error: any) => {
      if (error?.errorType === 'auth' || error?.errorType === 'maintenance') return false;
      if (error?.status === 401) return false;
      return failureCount < 1;
    },
  });
}
