import { useMutation, useQueryClient } from '@tanstack/react-query';

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

function getAccessToken() {
  return localStorage.getItem('bungie_access_token') || '';
}

export function useTransferItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: TransferParams) => {
      const res = await fetch('/api/bungie/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAccessToken()}`,
        },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Transfer failed' }));
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bungie/profile-state'] });
    },
  });
}

export function useEquipItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: EquipParams) => {
      const res = await fetch('/api/bungie/equip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAccessToken()}`,
        },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Equip failed' }));
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bungie/profile-state'] });
    },
  });
}

export function useSwapItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SwapParams) => {
      const { item, targetCharacterId, membershipType } = params;
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getAccessToken()}`,
      };

      if (item.location === 'vault') {
        await fetch('/api/bungie/transfer', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            itemReferenceHash: item.itemHash,
            itemId: item.id,
            characterId: targetCharacterId,
            membershipType,
            transferToVault: false,
          }),
        }).then(r => { if (!r.ok) throw new Error('Transfer from vault failed'); return r.json(); });

        await fetch('/api/bungie/equip', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            itemId: item.id,
            characterId: targetCharacterId,
            membershipType,
          }),
        }).then(r => { if (!r.ok) throw new Error('Equip failed'); return r.json(); });

      } else if (item.location === 'character' && item.characterId === targetCharacterId) {
        await fetch('/api/bungie/equip', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            itemId: item.id,
            characterId: targetCharacterId,
            membershipType,
          }),
        }).then(r => { if (!r.ok) throw new Error('Equip failed'); return r.json(); });

      } else if (item.location === 'character' && item.characterId !== targetCharacterId) {
        await fetch('/api/bungie/transfer', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            itemReferenceHash: item.itemHash,
            itemId: item.id,
            characterId: item.characterId,
            membershipType,
            transferToVault: true,
          }),
        }).then(r => { if (!r.ok) throw new Error('Transfer to vault failed'); return r.json(); });

        await fetch('/api/bungie/transfer', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            itemReferenceHash: item.itemHash,
            itemId: item.id,
            characterId: targetCharacterId,
            membershipType,
            transferToVault: false,
          }),
        }).then(r => { if (!r.ok) throw new Error('Transfer from vault failed'); return r.json(); });

        await fetch('/api/bungie/equip', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            itemId: item.id,
            characterId: targetCharacterId,
            membershipType,
          }),
        }).then(r => { if (!r.ok) throw new Error('Equip failed'); return r.json(); });
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/bungie/profile-state'] });
    },
  });
}
