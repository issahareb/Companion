import { useQuery } from '@tanstack/react-query';

export interface CharacterSummary {
  characterId: string;
  classType: number;
  className: string;
  raceName: string;
  light: number;
  emblemPath: string;
  emblemBackgroundPath: string;
  dateLastPlayed: string;
  equippedItems: any[];
}

export function useCharacters(membershipType?: number, membershipId?: string) {
  return useQuery<CharacterSummary[]>({
    queryKey: ['/api/bungie/characters', membershipType, membershipId],
    queryFn: async () => {
      if (!membershipType || !membershipId) return [];

      const res = await fetch(
        `/api/bungie/characters/${membershipType}/${membershipId}`,
        { credentials: 'include' }
      );

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(error.message || 'Failed to fetch characters');
      }

      return res.json();
    },
    enabled: !!membershipType && !!membershipId,
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
}
