export interface Gear {
  id: string;
  itemHash: number;
  name: string;
  slot: string;
  rarity: string;
  location: string;
  isInstanced?: boolean;
  classType?: number;
  stats?: { statHash: number; name: string; value: number }[];
  sockets?: { socketIndex: number; plugHash: number }[];
}

export function duplicateGroups<T extends Gear>(items: T[]): T[][] {
  const groups = new Map<number, Map<string, T>>();
  for (const item of items) {
    if (!item.isInstanced || item.location === "postmaster") continue;
    const group = groups.get(item.itemHash) || new Map<string, T>();
    group.set(item.id, item);
    groups.set(item.itemHash, group);
  }
  return [...groups.values()]
    .filter((group) => group.size > 1)
    .map((group) => [...group.values()])
    .sort((a, b) => b.length - a.length || a[0].name.localeCompare(b[0].name));
}

const armorSlots = ["helmet", "arms", "chest", "legs", "class"];
export function selectArmor<T extends Gear>(
  items: T[],
  classType: number,
  priority?: number,
): T[] {
  // Exact additive stat selection with at most one exotic, using two DP states.
  // Stats are the values reported by Bungie, including any applied bonuses.
  const unique = [
    ...new Map(
      items
        .filter(
          (item) =>
            item.isInstanced &&
            item.location !== "postmaster" &&
            (item.classType === classType || item.classType === 3),
        )
        .map((item) => [item.id, item]),
    ).values(),
  ];
  const score = (item: T) =>
    (item.stats || []).reduce(
      (sum, stat) =>
        sum +
        (Number.isFinite(stat.value) ? stat.value : 0) *
          (stat.statHash === priority ? 3 : 1),
      0,
    );
  let states: { items: T[]; score: number; exotics: number }[] = [
    { items: [], score: 0, exotics: 0 },
  ];
  for (const slot of armorSlots) {
    const next = new Map<number, (typeof states)[number]>();
    for (const state of states)
      for (const item of unique.filter((item) => item.slot === slot)) {
        if (!item.stats?.length && slot !== "class") continue;
        const exotics = state.exotics + Number(item.rarity === "exotic");
        if (exotics > 1) continue;
        const candidate = {
          items: [...state.items, item],
          score: state.score + score(item),
          exotics,
        };
        if (!next.has(exotics) || candidate.score > next.get(exotics)!.score)
          next.set(exotics, candidate);
      }
    states = [...next.values()];
  }
  return states.sort((a, b) => b.score - a.score)[0]?.items || [];
}

export interface ActivitySample {
  modeType: number;
  kills: number;
  deaths: number;
  completed: boolean;
  duration: number;
}
export function summarizeActivities(activities: ActivitySample[]) {
  const kills = activities.reduce((sum, a) => sum + a.kills, 0);
  const deaths = activities.reduce((sum, a) => sum + a.deaths, 0);
  const modes = new Map<number, number>();
  for (const a of activities)
    modes.set(a.modeType, (modes.get(a.modeType) || 0) + 1);
  return {
    count: activities.length,
    kills,
    deaths,
    kd: deaths ? kills / deaths : null,
    completions: activities.filter((a) => a.completed).length,
    seconds: activities.reduce((sum, a) => sum + a.duration, 0),
    modes: [...modes]
      .map(([mode, count]) => ({ mode, count }))
      .sort((a, b) => b.count - a.count),
  };
}
