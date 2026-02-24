import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type LoadoutInput } from "@shared/routes";

export function useLoadouts(bungieMembershipId?: string) {
  return useQuery({
    queryKey: [api.loadouts.list.path, bungieMembershipId],
    queryFn: async () => {
      if (!bungieMembershipId) return [];
      const url = buildUrl(api.loadouts.list.path, { bungieMembershipId });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch loadouts");
      return api.loadouts.list.responses[200].parse(await res.json());
    },
    enabled: !!bungieMembershipId,
  });
}

export function useSaveLoadout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: LoadoutInput) => {
      const validated = api.loadouts.create.input.parse(data);
      const res = await fetch(api.loadouts.create.path, {
        method: api.loadouts.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      
      if (!res.ok) {
        if (res.status === 400) {
          const error = api.loadouts.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to save loadout");
      }
      
      return api.loadouts.create.responses[201].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [api.loadouts.list.path, variables.bungieMembershipId],
      });
    },
  });
}

export function useDeleteLoadout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, bungieMembershipId }: { id: number; bungieMembershipId: string }) => {
      const res = await fetch(`/api/loadouts/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to delete loadout');
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: [api.loadouts.list.path, variables.bungieMembershipId],
      });
    },
  });
}
