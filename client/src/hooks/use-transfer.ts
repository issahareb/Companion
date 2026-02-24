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

export function useTransferItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: TransferParams) => {
      const accessToken = localStorage.getItem('bungie_access_token');
      const res = await fetch('/api/bungie/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
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
      queryClient.invalidateQueries({ queryKey: ['/api/bungie/inventory'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bungie/characters'] });
    },
  });
}

export function useEquipItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: EquipParams) => {
      const accessToken = localStorage.getItem('bungie_access_token');
      const res = await fetch('/api/bungie/equip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
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
      queryClient.invalidateQueries({ queryKey: ['/api/bungie/inventory'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bungie/characters'] });
    },
  });
}
