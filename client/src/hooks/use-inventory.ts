import { useQuery } from '@tanstack/react-query';
import type { Item } from '@/components/Inventory';

export function useInventory(membershipType?: number, membershipId?: string) {
  return useQuery<Item[]>({
    queryKey: ['/api/bungie/inventory', membershipType, membershipId],
    queryFn: async () => {
      if (!membershipType || !membershipId) return [];

      const res = await fetch(
        `/api/bungie/inventory/${membershipType}/${membershipId}`,
        { credentials: 'include' }
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
