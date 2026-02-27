import { useMutation, useQueryClient, useIsMutating } from '@tanstack/react-query';

interface TransferParams {
  itemReferenceHash: number;
  itemId: string;
  characterId: string;
  membershipType: number;
  transferToVault: boolean;
}

interface EquipParams {
  itemId: string;
  characterId: string;
  membershipType: number;
}

interface SwapParams {
  item: {
    id: string;
    itemHash: number;
    location: string;
    characterId?: string;
  };
  targetCharacterId: string;
  membershipType: number;
}

interface PullPostmasterParams {
  itemReferenceHash: number;
  itemId: string;
  characterId: string;
  membershipType: number;
}

interface SetLockStateParams {
  itemId: string;
  characterId: string;
  membershipType: number;
  state: boolean;
}

interface EquipItemsParams {
  itemIds: string[];
  characterId: string;
  membershipType: number;
}

const BUNGIE_MUTATION_KEY = ['bungie-mutation'];

function getAccessToken() {
  return localStorage.getItem('bungie_access_token') || '';
}

function makeHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${getAccessToken()}`,
  };
}

async function bungiePostRequest(url: string, body: any, signal?: AbortSignal) {
  const res = await fetch(url, {
    method: 'POST',
    headers: makeHeaders(),
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok) {
    let errorData: any;
    try {
      errorData = await res.json();
    } catch {
      errorData = { message: 'Request failed' };
    }
    const error = new Error(errorData.message || 'Request failed');
    (error as any).status = res.status;
    (error as any).errorType = errorData.errorType || null;
    throw error;
  }
  return res.json();
}

export function useIsBungieMutating() {
  return useIsMutating({ mutationKey: BUNGIE_MUTATION_KEY }) > 0;
}

export function useTransferItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: BUNGIE_MUTATION_KEY,
    mutationFn: async (params: TransferParams) => {
      return bungiePostRequest('/api/bungie/transfer', params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bungie/profile-state'] });
    },
  });
}

export function useEquipItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: BUNGIE_MUTATION_KEY,
    mutationFn: async (params: EquipParams) => {
      return bungiePostRequest('/api/bungie/equip', params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bungie/profile-state'] });
    },
  });
}

export function useSwapItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: BUNGIE_MUTATION_KEY,
    mutationFn: async (params: SwapParams) => {
      const { item, targetCharacterId, membershipType } = params;

      if (item.location === 'vault') {
        await bungiePostRequest('/api/bungie/transfer', {
          itemReferenceHash: item.itemHash,
          itemId: item.id,
          characterId: targetCharacterId,
          membershipType,
          transferToVault: false,
        });

        await bungiePostRequest('/api/bungie/equip', {
          itemId: item.id,
          characterId: targetCharacterId,
          membershipType,
        });

      } else if (item.location === 'character' && item.characterId === targetCharacterId) {
        await bungiePostRequest('/api/bungie/equip', {
          itemId: item.id,
          characterId: targetCharacterId,
          membershipType,
        });

      } else if (item.location === 'character' && item.characterId !== targetCharacterId) {
        await bungiePostRequest('/api/bungie/transfer', {
          itemReferenceHash: item.itemHash,
          itemId: item.id,
          characterId: item.characterId!,
          membershipType,
          transferToVault: true,
        });

        await bungiePostRequest('/api/bungie/transfer', {
          itemReferenceHash: item.itemHash,
          itemId: item.id,
          characterId: targetCharacterId,
          membershipType,
          transferToVault: false,
        });

        await bungiePostRequest('/api/bungie/equip', {
          itemId: item.id,
          characterId: targetCharacterId,
          membershipType,
        });
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bungie/profile-state'] });
    },
  });
}

export function usePullFromPostmaster() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: BUNGIE_MUTATION_KEY,
    mutationFn: async (params: PullPostmasterParams) => {
      return bungiePostRequest('/api/bungie/pull-postmaster', params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bungie/profile-state'] });
    },
  });
}

export function useSetLockState() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: BUNGIE_MUTATION_KEY,
    mutationFn: async (params: SetLockStateParams) => {
      return bungiePostRequest('/api/bungie/lock', params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bungie/profile-state'] });
    },
  });
}

interface InsertPlugParams {
  itemInstanceId: string;
  socketIndex: number;
  plugItemHash: number;
  characterId: string;
  membershipType: number;
}

export function useInsertPlug() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: BUNGIE_MUTATION_KEY,
    mutationFn: async (params: InsertPlugParams) => {
      return bungiePostRequest('/api/bungie/insert-plug', params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bungie/profile-state'] });
    },
  });
}

interface EquipLoadoutParams {
  loadoutIndex: number;
  characterId: string;
  membershipType: number;
}

interface SnapshotLoadoutParams {
  loadoutIndex: number;
  characterId: string;
  membershipType: number;
  nameHash?: number;
  colorHash?: number;
  iconHash?: number;
}

interface ClearLoadoutParams {
  loadoutIndex: number;
  characterId: string;
  membershipType: number;
}

export function useEquipLoadout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: BUNGIE_MUTATION_KEY,
    mutationFn: async (params: EquipLoadoutParams) => {
      return bungiePostRequest('/api/bungie/equip-loadout', params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bungie/profile-state'] });
    },
  });
}

export function useSnapshotLoadout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: BUNGIE_MUTATION_KEY,
    mutationFn: async (params: SnapshotLoadoutParams) => {
      return bungiePostRequest('/api/bungie/snapshot-loadout', params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bungie/profile-state'] });
    },
  });
}

export function useClearLoadout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: BUNGIE_MUTATION_KEY,
    mutationFn: async (params: ClearLoadoutParams) => {
      return bungiePostRequest('/api/bungie/clear-loadout', params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bungie/profile-state'] });
    },
  });
}

export function useEquipItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: BUNGIE_MUTATION_KEY,
    mutationFn: async (params: EquipItemsParams) => {
      return bungiePostRequest('/api/bungie/equip-items', params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bungie/profile-state'] });
    },
  });
}
