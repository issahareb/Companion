import { bungieGet, fetchManifest } from "./bungie";

const image = (path?: string) =>
  path
    ? path.startsWith("https://")
      ? path
      : `https://www.bungie.net${path}`
    : "";
let definitions:
  | {
      at: number;
      vendors: Record<string, any>;
      milestones: Record<string, any>;
    }
  | undefined;
let pendingDefinitions: Promise<NonNullable<typeof definitions>> | undefined;
async function getDefinitions() {
  if (definitions && Date.now() - definitions.at < 3_600_000)
    return definitions;
  if (pendingDefinitions) return pendingDefinitions;
  pendingDefinitions = (async () => {
    const manifest = await bungieGet("/Platform/Destiny2/Manifest/");
    const paths = manifest.Response.jsonWorldComponentContentPaths.en;
    const [vendors, milestones] = await Promise.all([
      bungieGet(paths.DestinyVendorDefinition),
      bungieGet(paths.DestinyMilestoneDefinition),
    ]);
    definitions = { at: Date.now(), vendors, milestones };
    return definitions;
  })().finally(() => {
    pendingDefinitions = undefined;
  });
  return pendingDefinitions;
}

export async function fetchWeeklyMilestones() {
  const [data, defs] = await Promise.all([
    bungieGet("/Platform/Destiny2/Milestones/"),
    getDefinitions(),
  ]);
  return Object.entries(data.Response || {}).map(
    ([hash, value]: [string, any]) => {
      const def = defs.milestones[hash];
      return {
        hash: Number(hash),
        name: def?.displayProperties?.name || `Milestone ${hash}`,
        description: def?.displayProperties?.description || "",
        icon: image(def?.displayProperties?.icon),
        startDate: value.startDate || null,
        endDate: value.endDate || null,
        activityHashes: (value.activities || []).map(
          (a: any) => a.activityHash,
        ),
      };
    },
  );
}

export async function fetchCharacterVendors(
  type: string,
  membership: string,
  character: string,
  token: string,
) {
  const [data, defs, manifest] = await Promise.all([
    bungieGet(
      `/Platform/Destiny2/${type}/Profile/${membership}/Character/${character}/Vendors/?components=400,402`,
      token,
    ),
    getDefinitions(),
    fetchManifest(),
  ]);
  const response = data.Response || {};
  return {
    unavailable: !response.vendors?.data || response.vendors?.disabled === true,
    vendors: Object.entries(response.vendors?.data || {}).map(
      ([hash, vendor]: [string, any]) => {
        const def = defs.vendors[hash];
        const sales = response.sales?.data?.[hash]?.saleItems;
        return {
          hash: Number(hash),
          name: def?.displayProperties?.name || `Vendor ${hash}`,
          icon: image(def?.displayProperties?.icon),
          nextRefreshDate: vendor.nextRefreshDate || null,
          salesUnavailable: !sales,
          items: Object.values(sales || {}).map((sale: any) => {
            const item = manifest.items[String(sale.itemHash)];
            return {
              index: sale.vendorItemIndex,
              itemHash: sale.itemHash,
              name:
                item?.name ||
                def?.itemList?.find((i: any) => i.itemHash === sale.itemHash)
                  ?.displayProperties?.name ||
                `Item ${sale.itemHash}`,
              icon: item?.icon || "",
              quantity: sale.quantity,
              available: sale.saleStatus === 0,
              costs: (sale.costs || []).map((cost: any) => ({
                itemHash: cost.itemHash,
                name:
                  manifest.items[String(cost.itemHash)]?.name ||
                  `Currency ${cost.itemHash}`,
                quantity: cost.quantity,
              })),
            };
          }),
        };
      },
    ),
  };
}

export async function fetchActivityReport(activityId: string, token: string) {
  const [data, manifest] = await Promise.all([
    bungieGet(
      `/Platform/Destiny2/Stats/PostGameCarnageReport/${activityId}/`,
      token,
    ),
    fetchManifest(),
  ]);
  const report = data.Response;
  if (!report) throw new Error("No activity report available");
  // Missing metrics stay null; absence is never presented as zero damage/kills.
  const metric = (values: any, key: string): number | null => {
    const value = values?.[key]?.basic?.value;
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  };
  return {
    activityId,
    date: report.period,
    name:
      manifest.activities[String(report.activityDetails?.referenceId)]?.name ||
      "Activity",
    players: (report.entries || []).map((entry: any) => ({
      characterId: entry.characterId,
      name:
        entry.player?.destinyUserInfo?.bungieGlobalDisplayName ||
        entry.player?.destinyUserInfo?.displayName ||
        "Guardian",
      kills: metric(entry.values, "kills"),
      deaths: metric(entry.values, "deaths"),
      assists: metric(entry.values, "assists"),
      weapons: (entry.extended?.weapons || []).map((weapon: any) => ({
        itemHash: weapon.referenceId,
        name:
          manifest.items[String(weapon.referenceId)]?.name ||
          `Weapon ${weapon.referenceId}`,
        kills: metric(weapon.values, "uniqueWeaponKills"),
        precisionKills: metric(weapon.values, "uniqueWeaponPrecisionKills"),
      })),
    })),
  };
}
