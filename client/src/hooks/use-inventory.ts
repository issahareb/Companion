import { useQuery } from '@tanstack/react-query';
import type { Item } from '@/components/Inventory';

export function useInventory(membershipType?: number, membershipId?: string) {
  return useQuery<Item[]>({
    queryKey: ['/api/bungie/inventory', membershipType, membershipId],
    queryFn: async () => {
      const accessToken = localStorage.getItem('bungie_access_token');
      if (!accessToken || !membershipType || !membershipId) return [];

      const res = await fetch(
        `/api/bungie/inventory/${membershipType}/${membershipId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(error.message || 'Failed to fetch inventory');
      }

      return res.json();
    },
    enabled: !!membershipType && !!membershipId,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
}
