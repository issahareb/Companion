const BUNGIE_API_KEY = process.env.BUNGIE_API_KEY;
const BUNGIE_BASE = 'https://www.bungie.net';

if (!BUNGIE_API_KEY) {
  console.warn('[bungie] BUNGIE_API_KEY not set - Bungie API calls will fail');
}

const GEAR_BUCKET_TO_SLOT: Record<number, string> = {
  1498876634: 'kinetic',
  2465295065: 'energy',
  953998645: 'power',
  3448274439: 'helmet',
  3551918588: 'arms',
  14239492: 'chest',
  20886954: 'legs',
  1585787867: 'class',
  3284755031: 'subclass',
  4023194814: 'ghost',
  4274335291: 'emblem',
  2849688127: 'ship',
  2025709351: 'sparrow',
  335592533: 'emote',
};

const GENERAL_SLOTS = ['ghost', 'emblem', 'ship', 'sparrow', 'emote'];

const VAULT_BUCKET = 138197802;
const POSTMASTER_BUCKET = 215938771;
const QUEST_BUCKET = 1345459588;
const PURSUITS_BUCKET = 1345459588;

const WEAPON_SLOTS = ['kinetic', 'energy', 'power'];
const ARMOR_SLOTS = ['helmet', 'arms', 'chest', 'legs', 'class'];

const CONSUMABLE_BUCKETS = new Set([
  1469714392,  // Consumables
  3313201758,  // Modifications
  2973005342,  // Shaders
  4274335291,  // Emblems
  1585787867,  // Class Items
  375726501,   // Engrams
  3054419239,  // Materials
]);

const TIER_TO_RARITY: Record<string, 'common' | 'uncommon' | 'rare' | 'legendary' | 'exotic'> = {
  Common: 'common',
  Basic: 'common',
  Uncommon: 'uncommon',
  Rare: 'rare',
  Superior: 'legendary',
  Legendary: 'legendary',
  Exotic: 'exotic',
};

const CURRENCY_HASHES: Record<number, string> = {
  3159615086: 'Glimmer',
  1022552290: 'Legendary Shards',
  2817410917: 'Bright Dust',
  3147280338: 'Silver',
};

interface CollectibleDef {
  name: string;
  icon: string;
  description: string;
  sourceString: string;
}

interface RecordDef {
  name: string;
  icon: string;
  description: string;
  scoreValue: number;
  objectiveHashes: number[];
}

interface ProgressionDef {
  name: string;
  icon: string;
  description: string;
}

interface ObjectiveDef {
  description: string;
  completionValue: number;
}

interface ActivityDef {
  name: string;
  icon: string;
  description: string;
}

interface LoadoutNameDef {
  name: string;
}

interface LoadoutColorDef {
  colorImagePath: string;
}

interface LoadoutIconDef {
  iconImagePath: string;
}

interface ManifestCache {
  version: string;
  items: Record<string, ManifestItem>;
  collectibles: Record<string, CollectibleDef>;
  records: Record<string, RecordDef>;
  progressions: Record<string, ProgressionDef>;
  objectives: Record<string, ObjectiveDef>;
  activities: Record<string, ActivityDef>;
  loadoutNames: Record<string, LoadoutNameDef>;
  loadoutColors: Record<string, LoadoutColorDef>;
  loadoutIcons: Record<string, LoadoutIconDef>;
  fetchedAt: number;
}

interface ManifestItem {
  name: string;
  icon: string;
  screenshot: string;
  type: string;
  bucketHash: number;
  tierTypeName: string;
  itemType: number;
  itemSubType: number;
  classType: number;
  description: string;
}

let manifestCache: ManifestCache | null = null;
const MANIFEST_TTL = 24 * 60 * 60 * 1000;

async function bungieGet(path: string, accessToken?: string) {
  const headers: Record<string, string> = {
    'X-API-Key': BUNGIE_API_KEY || '',
  };
  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }
  const res = await fetch(`${BUNGIE_BASE}${path}`, { headers });
  if (!res.ok) {
    throw new Error(`Bungie API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function fetchManifest(): Promise<ManifestCache> {
  if (manifestCache && Date.now() - manifestCache.fetchedAt < MANIFEST_TTL) {
    return manifestCache;
  }

  console.log('[bungie] Fetching manifest...');
  const manifestData = await bungieGet('/Platform/Destiny2/Manifest/');
  const manifestVersion = manifestData.Response.version;

  if (manifestCache && manifestCache.version === manifestVersion) {
    manifestCache.fetchedAt = Date.now();
    return manifestCache;
  }

  const paths = manifestData.Response.jsonWorldComponentContentPaths.en;

  const [itemDefs, collectibleDefs, recordDefs, progressionDefs, objectiveDefs, activityDefs, loadoutNameDefs, loadoutColorDefs, loadoutIconDefs] = await Promise.all([
    fetch(`${BUNGIE_BASE}${paths.DestinyInventoryItemDefinition}`).then(r => r.json()),
    fetch(`${BUNGIE_BASE}${paths.DestinyCollectibleDefinition}`).then(r => r.json()).catch(() => ({})),
    fetch(`${BUNGIE_BASE}${paths.DestinyRecordDefinition}`).then(r => r.json()).catch(() => ({})),
    fetch(`${BUNGIE_BASE}${paths.DestinyProgressionDefinition}`).then(r => r.json()).catch(() => ({})),
    fetch(`${BUNGIE_BASE}${paths.DestinyObjectiveDefinition}`).then(r => r.json()).catch(() => ({})),
    fetch(`${BUNGIE_BASE}${paths.DestinyActivityDefinition}`).then(r => r.json()).catch(() => ({})),
    paths.DestinyLoadoutNameDefinition ? fetch(`${BUNGIE_BASE}${paths.DestinyLoadoutNameDefinition}`).then(r => r.json()).catch(() => ({})) : Promise.resolve({}),
    paths.DestinyLoadoutColorDefinition ? fetch(`${BUNGIE_BASE}${paths.DestinyLoadoutColorDefinition}`).then(r => r.json()).catch(() => ({})) : Promise.resolve({}),
    paths.DestinyLoadoutIconDefinition ? fetch(`${BUNGIE_BASE}${paths.DestinyLoadoutIconDefinition}`).then(r => r.json()).catch(() => ({})) : Promise.resolve({}),
  ]);

  const items: Record<string, ManifestItem> = {};
  for (const [hash, def] of Object.entries(itemDefs) as [string, any][]) {
    if (!def.displayProperties?.name) continue;
    const bucketHash = def.inventory?.bucketTypeHash || 0;

    const isGear = !!GEAR_BUCKET_TO_SLOT[bucketHash];
    const isQuest = bucketHash === QUEST_BUCKET || bucketHash === PURSUITS_BUCKET;
    const isCurrency = !!CURRENCY_HASHES[Number(hash)];
    const isPlug = def.plug != null;
    const isSubclassAbility = def.itemType === 19 || (def.traitIds && def.traitIds.some((t: string) => t.includes('subclass')));

    if (!isGear && !isQuest && !isCurrency && !isPlug && !isSubclassAbility &&
        bucketHash !== POSTMASTER_BUCKET && !CONSUMABLE_BUCKETS.has(bucketHash)) continue;

    items[hash] = {
      name: def.displayProperties.name,
      icon: def.displayProperties.hasIcon
        ? `${BUNGIE_BASE}${def.displayProperties.icon}`
        : '',
      screenshot: def.screenshot
        ? `${BUNGIE_BASE}${def.screenshot}`
        : '',
      type: def.itemTypeDisplayName || '',
      bucketHash,
      tierTypeName: def.inventory?.tierTypeName || 'Common',
      itemType: def.itemType || 0,
      itemSubType: def.itemSubType || 0,
      classType: def.classType ?? 3,
      description: def.displayProperties.description || '',
    };
  }

  const collectibles: Record<string, CollectibleDef> = {};
  for (const [hash, def] of Object.entries(collectibleDefs) as [string, any][]) {
    if (!def.displayProperties?.name) continue;
    collectibles[hash] = {
      name: def.displayProperties.name,
      icon: def.displayProperties.hasIcon ? `${BUNGIE_BASE}${def.displayProperties.icon}` : '',
      description: def.displayProperties.description || '',
      sourceString: def.sourceString || '',
    };
  }

  const records: Record<string, RecordDef> = {};
  for (const [hash, def] of Object.entries(recordDefs) as [string, any][]) {
    if (!def.displayProperties?.name) continue;
    records[hash] = {
      name: def.displayProperties.name,
      icon: def.displayProperties.hasIcon ? `${BUNGIE_BASE}${def.displayProperties.icon}` : '',
      description: def.displayProperties.description || '',
      scoreValue: def.completionInfo?.ScoreValue || 0,
      objectiveHashes: def.objectiveHashes || [],
    };
  }

  const progressions: Record<string, ProgressionDef> = {};
  for (const [hash, def] of Object.entries(progressionDefs) as [string, any][]) {
    if (!def.displayProperties?.name) continue;
    progressions[hash] = {
      name: def.displayProperties.name,
      icon: def.displayProperties.hasIcon ? `${BUNGIE_BASE}${def.displayProperties.icon}` : '',
      description: def.displayProperties.description || '',
    };
  }

  const objectives: Record<string, ObjectiveDef> = {};
  for (const [hash, def] of Object.entries(objectiveDefs) as [string, any][]) {
    objectives[hash] = {
      description: def.progressDescription || def.displayProperties?.description || '',
      completionValue: def.completionValue || 0,
    };
  }

  const activities: Record<string, ActivityDef> = {};
  for (const [hash, def] of Object.entries(activityDefs) as [string, any][]) {
    if (!def.displayProperties?.name) continue;
    activities[hash] = {
      name: def.displayProperties.name,
      icon: def.displayProperties.hasIcon ? `${BUNGIE_BASE}${def.displayProperties.icon}` : '',
      description: def.displayProperties.description || '',
    };
  }

  const loadoutNames: Record<string, LoadoutNameDef> = {};
  for (const [hash, def] of Object.entries(loadoutNameDefs) as [string, any][]) {
    loadoutNames[hash] = { name: def.name || '' };
  }

  const loadoutColors: Record<string, LoadoutColorDef> = {};
  for (const [hash, def] of Object.entries(loadoutColorDefs) as [string, any][]) {
    loadoutColors[hash] = { colorImagePath: def.colorImagePath ? `${BUNGIE_BASE}${def.colorImagePath}` : '' };
  }

  const loadoutIcons: Record<string, LoadoutIconDef> = {};
  for (const [hash, def] of Object.entries(loadoutIconDefs) as [string, any][]) {
    loadoutIcons[hash] = { iconImagePath: def.iconImagePath ? `${BUNGIE_BASE}${def.iconImagePath}` : '' };
  }

  manifestCache = { version: manifestVersion, items, collectibles, records, progressions, objectives, activities, loadoutNames, loadoutColors, loadoutIcons, fetchedAt: Date.now() };
  console.log(`[bungie] Manifest cached: ${Object.keys(items).length} items, ${Object.keys(collectibles).length} collectibles, ${Object.keys(records).length} records, ${Object.keys(loadoutNames).length} loadout names`);
  return manifestCache;
}

const BUNGIE_CLIENT_ID = '51625';

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  membership_id: string;
}

export async function exchangeToken(code: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: BUNGIE_CLIENT_ID,
    code,
  });

  const res = await fetch(`${BUNGIE_BASE}/Platform/App/OAuth/Token/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('[bungie] Token exchange failed:', res.status, text);
    throw new Error(`Token exchange failed: ${res.status}`);
  }

  return res.json();
}

export interface DestinyMembership {
  membershipId: string;
  membershipType: number;
  displayName: string;
  iconPath?: string;
}

export async function fetchMemberships(accessToken: string): Promise<DestinyMembership> {
  const data = await bungieGet('/Platform/User/GetMembershipsForCurrentUser/', accessToken);

  if (!data.Response?.destinyMemberships?.length) {
    throw new Error('No Destiny 2 memberships found');
  }

  const memberships = data.Response.destinyMemberships;
  const active = memberships.find(
    (m: any) => m.crossSaveOverride === m.membershipType
  ) || memberships[0];

  return {
    membershipId: active.membershipId,
    membershipType: active.membershipType,
    displayName: active.bungieGlobalDisplayName || active.displayName,
    iconPath: active.iconPath,
  };
}

const CLASS_NAMES: Record<number, string> = {
  0: 'Titan',
  1: 'Hunter',
  2: 'Warlock',
};

const RACE_NAMES: Record<number, string> = {
  0: 'Human',
  1: 'Awoken',
  2: 'Exo',
};

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

export interface ArtifactInfo {
  artifactHash: number;
  name: string;
  icon: string;
  powerBonus: number;
  pointsUsed: number;
  pointsAvailable: number;
  tiers: { tierHash: number; items: { itemHash: number; name: string; icon: string; isActive: boolean }[] }[];
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
  stats: Record<string, number>;
  equippedItems: InventoryItem[];
  inventory: InventoryItem[];
  quests: QuestItem[];
  progressions: ProgressionInfo[];
}

export interface InGameLoadoutItem {
  itemInstanceId: string;
  itemHash: number;
  name: string;
  icon: string;
  slot: string;
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

function parseGearItem(
  item: any,
  manifest: Record<string, ManifestItem>,
  instanceDetails: any,
  location: 'vault' | 'character' | 'equipped' | 'postmaster',
  characterId?: string
): InventoryItem | null {
  const hashStr = String(item.itemHash);
  const manifestItem = manifest[hashStr];
  if (!manifestItem) return null;

  const slot = GEAR_BUCKET_TO_SLOT[manifestItem.bucketHash];
  if (!slot && location !== 'postmaster') return null;

  const rarity = TIER_TO_RARITY[manifestItem.tierTypeName] || 'common';

  const instanceId = item.itemInstanceId || hashStr;
  const instance = item.itemInstanceId ? instanceDetails[item.itemInstanceId] : null;

  return {
    id: instanceId,
    itemHash: item.itemHash,
    name: manifestItem.name,
    type: manifestItem.type,
    slot: slot || 'unknown',
    rarity,
    power: instance?.primaryStat?.value || 0,
    icon: manifestItem.icon,
    screenshot: manifestItem.screenshot,
    location,
    characterId,
    classType: manifestItem.classType,
  };
}

function attachPerksAndMods(
  item: InventoryItem,
  itemPerks: any,
  itemSockets: any,
  itemReusablePlugs: any,
  manifestData: ManifestCache
) {
  const perkData = itemPerks[item.id];
  if (perkData?.perks) {
    item.perks = perkData.perks
      .filter((p: any) => p.visible)
      .slice(0, 8)
      .map((p: any) => ({
        perkHash: p.perkHash,
        name: p.displayProperties?.name || '',
        icon: p.displayProperties?.hasIcon ? `${BUNGIE_BASE}${p.displayProperties.icon}` : '',
        description: p.displayProperties?.description || '',
        isActive: p.isActive || false,
      }));
  }

  const socketData = itemSockets[item.id];
  const reusableData = itemReusablePlugs[item.id];
  if (socketData?.sockets) {
    item.mods = socketData.sockets
      .filter((s: any) => s.plugHash && s.isEnabled)
      .slice(0, 10)
      .map((s: any) => {
        const plugDef = manifestData.items[String(s.plugHash)];
        return {
          plugHash: s.plugHash,
          name: plugDef?.name || '',
          icon: plugDef?.icon || '',
          description: plugDef?.description || '',
        };
      })
      .filter((m: ModInfo) => m.name);

    item.sockets = socketData.sockets
      .map((s: any, idx: number) => {
        if (!s.plugHash) return null;
        const plugDef = manifestData.items[String(s.plugHash)];
        if (!plugDef) return null;

        const reusableForSocket = reusableData?.plugs?.[String(idx)] || [];
        const reusablePlugs: SocketPlugOption[] = reusableForSocket
          .map((rp: any) => {
            const rpDef = manifestData.items[String(rp.plugItemHash)];
            if (!rpDef || !rpDef.name) return null;
            return {
              plugHash: rp.plugItemHash,
              name: rpDef.name,
              icon: rpDef.icon,
              description: rpDef.description || '',
            };
          })
          .filter(Boolean);

        return {
          socketIndex: idx,
          plugHash: s.plugHash,
          name: plugDef.name,
          icon: plugDef.icon,
          description: plugDef.description || '',
          isEnabled: s.isEnabled || false,
          reusablePlugs,
        };
      })
      .filter(Boolean) as SocketInfo[];
  }
}

export async function fetchProfileState(
  membershipType: string,
  membershipId: string,
  accessToken: string
): Promise<ProfileState> {
  const [manifestData, profileData] = await Promise.all([
    fetchManifest(),
    bungieGet(
      `/Platform/Destiny2/${membershipType}/Profile/${membershipId}/?components=100,102,103,104,200,201,202,205,300,302,304,305,800,900,4000`,
      accessToken
    ),
  ]);

  const manifest = manifestData.items;
  const response = profileData.Response;
  if (!response) {
    throw new Error('No profile data returned from Bungie');
  }

  const instanceDetails = response.itemComponents?.instances?.data || {};
  const itemPerks = response.itemComponents?.perks?.data || {};
  const itemSockets = response.itemComponents?.sockets?.data || {};
  const itemReusablePlugs = response.itemComponents?.reusablePlugs?.data || {};

  const currencies: CurrencyInfo[] = [];
  const profileCurrencies = response.profileCurrencies?.data?.items;
  if (profileCurrencies) {
    for (const curr of profileCurrencies) {
      const hashStr = String(curr.itemHash);
      const currName = CURRENCY_HASHES[curr.itemHash];
      const manifestItem = manifest[hashStr];
      if (currName || manifestItem) {
        currencies.push({
          itemHash: curr.itemHash,
          name: currName || manifestItem?.name || 'Unknown',
          icon: manifestItem?.icon || '',
          quantity: curr.quantity || 0,
        });
      }
    }
  }

  const vaultItems: InventoryItem[] = [];
  const postmasterItems: InventoryItem[] = [];

  const profileInventory = response.profileInventory?.data?.items;
  console.log(`[bungie] profileInventory items count: ${profileInventory?.length || 0}`);
  let vaultBucketCount = 0;
  let vaultParseFails = 0;
  if (profileInventory) {
    for (const item of profileInventory) {
      const hashStr = String(item.itemHash);
      const manifestItem = manifest[hashStr];
      if (!manifestItem) continue;

      if (item.bucketHash === VAULT_BUCKET || manifestItem.bucketHash === VAULT_BUCKET) {
        vaultBucketCount++;
        const parsed = parseGearItem(item, manifest, instanceDetails, 'vault');
        if (parsed) {
          attachPerksAndMods(parsed, itemPerks, itemSockets, itemReusablePlugs, manifestData);
          vaultItems.push(parsed);
        } else {
          vaultParseFails++;
          const slot = GEAR_BUCKET_TO_SLOT[manifestItem.bucketHash];
          if (vaultParseFails <= 5) {
            console.log(`[bungie] vault parse fail: "${manifestItem.name}" bucket=${manifestItem.bucketHash} slot=${slot} tier=${manifestItem.tierTypeName}`);
          }
        }
      }
    }
  }
  console.log(`[bungie] vault bucket items: ${vaultBucketCount}, parsed ok: ${vaultItems.length}, parse fails: ${vaultParseFails}`);

  const characters: CharacterData[] = [];
  const characterData = response.characters?.data || {};
  const characterInventories = response.characterInventories?.data || {};
  const characterEquipment = response.characterEquipment?.data || {};

  const characterProgressions = response.characterProgressions?.data || {};

  for (const [charId, charInfo] of Object.entries(characterData) as [string, any][]) {
    const equipped: InventoryItem[] = [];
    const charEquip = characterEquipment[charId];
    if (charEquip?.items) {
      for (const item of charEquip.items) {
        const parsed = parseGearItem(item, manifest, instanceDetails, 'equipped', charId);
        if (parsed) {
          attachPerksAndMods(parsed, itemPerks, itemSockets, itemReusablePlugs, manifestData);
          equipped.push(parsed);
        }
      }
    }

    const charInventory: InventoryItem[] = [];
    const charInv = characterInventories[charId];
    if (charInv?.items) {
      for (const item of charInv.items) {
        const hashStr = String(item.itemHash);
        const manifestItem = manifest[hashStr];
        if (!manifestItem) continue;

        if (item.bucketHash === POSTMASTER_BUCKET) {
          const parsed = parseGearItem(item, manifest, instanceDetails, 'postmaster', charId);
          if (parsed) {
            console.log(`[bungie] postmaster item found for char ${charId}: "${parsed.name}" (hash=${item.itemHash})`);
            postmasterItems.push(parsed);
          } else {
            console.log(`[bungie] postmaster item parse failed: hash=${item.itemHash}, manifest=${manifestItem?.name || 'missing'}`);
          }
          continue;
        }

        if (manifestItem.bucketHash === QUEST_BUCKET) {
          continue;
        }

        const parsed = parseGearItem(item, manifest, instanceDetails, 'character', charId);
        if (parsed) {
          attachPerksAndMods(parsed, itemPerks, itemSockets, itemReusablePlugs, manifestData);
          charInventory.push(parsed);
        }
      }
    }

    const quests: QuestItem[] = [];
    if (charInv?.items) {
      for (const item of charInv.items) {
        const hashStr = String(item.itemHash);
        const manifestItem = manifest[hashStr];
        if (!manifestItem) continue;
        if (manifestItem.bucketHash === QUEST_BUCKET) {
          quests.push({
            id: item.itemInstanceId || hashStr,
            itemHash: item.itemHash,
            name: manifestItem.name,
            icon: manifestItem.icon,
            description: manifestItem.description,
            type: manifestItem.type,
          });
        }
      }
    }

    const charStats: Record<string, number> = {};
    if (charInfo.stats) {
      const statNames: Record<string, string> = {
        '2996146975': 'Mobility',
        '392767087': 'Resilience',
        '1943323491': 'Recovery',
        '1735777505': 'Discipline',
        '144602215': 'Intellect',
        '4244567218': 'Strength',
      };
      for (const [statHash, val] of Object.entries(charInfo.stats) as [string, any][]) {
        const statName = statNames[statHash];
        if (statName) {
          charStats[statName] = val;
        }
      }
    }

    const charProgs: ProgressionInfo[] = [];
    const progData = characterProgressions[charId]?.progressions;
    if (progData) {
      for (const [progHash, prog] of Object.entries(progData) as [string, any][]) {
        const progDef = manifestData.progressions[progHash];
        if (!progDef || !progDef.name) continue;
        charProgs.push({
          progressionHash: Number(progHash),
          name: progDef.name,
          icon: progDef.icon,
          level: prog.level || 0,
          currentProgress: prog.currentProgress || 0,
          nextLevelAt: prog.nextLevelAt || 0,
          progressToNextLevel: prog.progressToNextLevel || 0,
          dailyProgress: prog.dailyProgress || 0,
          currentResetCount: prog.currentResetCount || 0,
        });
      }
    }

    characters.push({
      characterId: charId,
      classType: charInfo.classType,
      className: CLASS_NAMES[charInfo.classType] || 'Unknown',
      raceName: RACE_NAMES[charInfo.raceType] || 'Unknown',
      light: charInfo.light || 0,
      emblemPath: charInfo.emblemPath ? `${BUNGIE_BASE}${charInfo.emblemPath}` : '',
      emblemBackgroundPath: charInfo.emblemBackgroundPath ? `${BUNGIE_BASE}${charInfo.emblemBackgroundPath}` : '',
      dateLastPlayed: charInfo.dateLastPlayed || '',
      stats: charStats,
      equippedItems: equipped,
      inventory: charInventory.sort((a, b) => b.power - a.power),
      quests,
      progressions: charProgs.filter(p => p.nextLevelAt > 0).sort((a, b) => b.currentProgress - a.currentProgress),
    });
  }

  characters.sort((a, b) => new Date(b.dateLastPlayed).getTime() - new Date(a.dateLastPlayed).getTime());
  vaultItems.sort((a, b) => b.power - a.power);

  const collectibles: CollectibleItem[] = [];
  const profileCollectibles = response.profileCollectibles?.data?.collectibles;
  if (profileCollectibles) {
    for (const [hash, state] of Object.entries(profileCollectibles) as [string, any][]) {
      const def = manifestData.collectibles[hash];
      if (!def || !def.name) continue;
      const notAcquired = (state.state & 1) !== 0;
      collectibles.push({
        collectibleHash: Number(hash),
        name: def.name,
        icon: def.icon,
        description: def.description,
        acquired: !notAcquired,
        sourceString: def.sourceString,
      });
    }
  }

  const records: RecordItem[] = [];
  const profileRecords = response.profileRecords?.data?.records;
  if (profileRecords) {
    for (const [hash, state] of Object.entries(profileRecords) as [string, any][]) {
      const def = manifestData.records[hash];
      if (!def || !def.name) continue;

      const objectives = (state.objectives || []).map((obj: any) => {
        const objDef = manifestData.objectives[String(obj.objectiveHash)];
        return {
          description: objDef?.description || '',
          progress: obj.progress || 0,
          completionValue: obj.completionValue || objDef?.completionValue || 0,
          complete: obj.complete || false,
        };
      });

      const isComplete = (state.state & 1) !== 0;
      records.push({
        recordHash: Number(hash),
        name: def.name,
        icon: def.icon,
        description: def.description,
        completed: isComplete,
        objectives,
        scoreValue: def.scoreValue,
      });
    }
  }

  console.log(`[bungie] collectibles: ${collectibles.length}, records: ${records.length}`);

  let artifact: ArtifactInfo | undefined;
  const profileProgression = response.profileProgression?.data;
  if (profileProgression?.seasonalArtifact) {
    const sa = profileProgression.seasonalArtifact;
    const artifactDef = manifest[String(sa.artifactHash)];
    const tiers = (sa.tiers || []).map((tier: any) => ({
      tierHash: tier.tierHash || 0,
      items: (tier.items || []).map((ti: any) => {
        const tiDef = manifest[String(ti.itemHash)];
        return {
          itemHash: ti.itemHash,
          name: tiDef?.name || '',
          icon: tiDef?.icon || '',
          isActive: ti.isActive || false,
        };
      }).filter((i: any) => i.name),
    }));

    artifact = {
      artifactHash: sa.artifactHash,
      name: artifactDef?.name || 'Seasonal Artifact',
      icon: artifactDef?.icon || '',
      powerBonus: sa.powerBonus || 0,
      pointsUsed: sa.pointsUsed || 0,
      pointsAvailable: sa.pointsAcquired || 0,
      tiers,
    };
  }

  const inGameLoadouts: Record<string, InGameLoadout[]> = {};
  const characterLoadouts = response.characterLoadouts?.data || {};
  for (const [charId, loadoutData] of Object.entries(characterLoadouts) as [string, any][]) {
    const charLoadouts: InGameLoadout[] = [];
    const loadouts = loadoutData.loadouts || [];
    for (let idx = 0; idx < loadouts.length; idx++) {
      const lo = loadouts[idx];
      const nameDef = manifestData.loadoutNames[String(lo.nameHash)];
      const colorDef = manifestData.loadoutColors[String(lo.colorHash)];
      const iconDef = manifestData.loadoutIcons[String(lo.iconHash)];

      const loItems: InGameLoadoutItem[] = (lo.items || [])
        .filter((li: any) => li.itemInstanceId && li.itemInstanceId !== '0')
        .map((li: any) => {
          const itemDef = manifest[String(li.itemHash)];
          return {
            itemInstanceId: li.itemInstanceId,
            itemHash: li.itemHash,
            name: itemDef?.name || '',
            icon: itemDef?.icon || '',
            slot: itemDef ? (GEAR_BUCKET_TO_SLOT[itemDef.bucketHash] || 'unknown') : 'unknown',
          };
        })
        .filter((li: InGameLoadoutItem) => li.name);

      charLoadouts.push({
        index: idx,
        nameHash: lo.nameHash || 0,
        colorHash: lo.colorHash || 0,
        iconHash: lo.iconHash || 0,
        name: nameDef?.name || `Loadout ${idx + 1}`,
        icon: iconDef?.iconImagePath || '',
        colorImagePath: colorDef?.colorImagePath || '',
        items: loItems,
      });
    }
    inGameLoadouts[charId] = charLoadouts.filter(l => l.items.length > 0);
  }

  console.log(`[bungie] total postmaster items: ${postmasterItems.length}`);
  return { characters, vaultItems, postmasterItems, currencies, collectibles, records, artifact, inGameLoadouts };
}

export interface TransferRequest {
  itemReferenceHash: number;
  itemId: string;
  characterId: string;
  membershipType: number;
  transferToVault: boolean;
}

export async function transferItem(request: TransferRequest, accessToken: string): Promise<any> {
  const body = {
    itemReferenceHash: request.itemReferenceHash,
    itemId: request.itemId,
    characterId: request.characterId,
    membershipType: request.membershipType,
    transferToVault: request.transferToVault,
    stackSize: 1,
  };

  const res = await fetch(`${BUNGIE_BASE}/Platform/Destiny2/Actions/Items/TransferItem/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': BUNGIE_API_KEY || '',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (data.ErrorCode !== 1) {
    throw new Error(data.Message || `Transfer failed: ${data.ErrorStatus}`);
  }
  return data;
}

export interface EquipRequest {
  itemId: string;
  characterId: string;
  membershipType: number;
}

export async function equipItem(request: EquipRequest, accessToken: string): Promise<any> {
  const body = {
    itemId: request.itemId,
    characterId: request.characterId,
    membershipType: request.membershipType,
  };

  const res = await fetch(`${BUNGIE_BASE}/Platform/Destiny2/Actions/Items/EquipItem/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': BUNGIE_API_KEY || '',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (data.ErrorCode !== 1) {
    throw new Error(data.Message || `Equip failed: ${data.ErrorStatus}`);
  }
  return data;
}

export interface PullPostmasterRequest {
  itemReferenceHash: number;
  itemId: string;
  characterId: string;
  membershipType: number;
}

export async function pullFromPostmaster(request: PullPostmasterRequest, accessToken: string): Promise<any> {
  const body = {
    itemReferenceHash: request.itemReferenceHash,
    itemId: request.itemId,
    characterId: request.characterId,
    membershipType: request.membershipType,
    stackSize: 1,
  };

  const res = await fetch(`${BUNGIE_BASE}/Platform/Destiny2/Actions/Items/PullFromPostmaster/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': BUNGIE_API_KEY || '',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (data.ErrorCode !== 1) {
    throw new Error(data.Message || `Pull from postmaster failed: ${data.ErrorStatus}`);
  }
  return data;
}

export interface SetLockStateRequest {
  itemId: string;
  characterId: string;
  membershipType: number;
  state: boolean;
}

export async function setLockState(request: SetLockStateRequest, accessToken: string): Promise<any> {
  const body = {
    itemId: request.itemId,
    characterId: request.characterId,
    membershipType: request.membershipType,
    state: request.state,
  };

  const res = await fetch(`${BUNGIE_BASE}/Platform/Destiny2/Actions/Items/SetLockState/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': BUNGIE_API_KEY || '',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (data.ErrorCode !== 1) {
    throw new Error(data.Message || `Lock state change failed: ${data.ErrorStatus}`);
  }
  return data;
}

export interface EquipItemsRequest {
  itemIds: string[];
  characterId: string;
  membershipType: number;
}

export async function equipItems(request: EquipItemsRequest, accessToken: string): Promise<any> {
  const body = {
    itemIds: request.itemIds,
    characterId: request.characterId,
    membershipType: request.membershipType,
  };

  const res = await fetch(`${BUNGIE_BASE}/Platform/Destiny2/Actions/Items/EquipItems/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': BUNGIE_API_KEY || '',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (data.ErrorCode !== 1) {
    throw new Error(data.Message || `Batch equip failed: ${data.ErrorStatus}`);
  }
  return data;
}

export interface InsertPlugRequest {
  itemInstanceId: string;
  socketIndex: number;
  plugItemHash: number;
  characterId: string;
  membershipType: number;
}

export async function insertSocketPlug(request: InsertPlugRequest, accessToken: string): Promise<any> {
  const body = {
    itemInstanceId: request.itemInstanceId,
    plug: {
      socketIndex: request.socketIndex,
      socketArrayType: 0,
      plugItemHash: request.plugItemHash,
    },
    characterId: request.characterId,
    membershipType: request.membershipType,
  };

  const res = await fetch(`${BUNGIE_BASE}/Platform/Destiny2/Actions/Items/InsertSocketPlugFree/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': BUNGIE_API_KEY || '',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (data.ErrorCode !== 1) {
    throw new Error(data.Message || `Insert socket plug failed: ${data.ErrorStatus}`);
  }
  return data;
}

export interface EquipLoadoutRequest {
  loadoutIndex: number;
  characterId: string;
  membershipType: number;
}

export async function equipLoadout(request: EquipLoadoutRequest, accessToken: string): Promise<any> {
  const body = {
    loadoutIndex: request.loadoutIndex,
    characterId: request.characterId,
    membershipType: request.membershipType,
  };

  const res = await fetch(`${BUNGIE_BASE}/Platform/Destiny2/Actions/Loadouts/EquipLoadout/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': BUNGIE_API_KEY || '',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (data.ErrorCode !== 1) {
    throw new Error(data.Message || `Equip loadout failed: ${data.ErrorStatus}`);
  }
  return data;
}

export interface SnapshotLoadoutRequest {
  loadoutIndex: number;
  characterId: string;
  membershipType: number;
  nameHash?: number;
  colorHash?: number;
  iconHash?: number;
}

export async function snapshotLoadout(request: SnapshotLoadoutRequest, accessToken: string): Promise<any> {
  const body: any = {
    loadoutIndex: request.loadoutIndex,
    characterId: request.characterId,
    membershipType: request.membershipType,
  };
  if (request.nameHash) body.nameHash = request.nameHash;
  if (request.colorHash) body.colorHash = request.colorHash;
  if (request.iconHash) body.iconHash = request.iconHash;

  const res = await fetch(`${BUNGIE_BASE}/Platform/Destiny2/Actions/Loadouts/SnapshotLoadout/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': BUNGIE_API_KEY || '',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (data.ErrorCode !== 1) {
    throw new Error(data.Message || `Snapshot loadout failed: ${data.ErrorStatus}`);
  }
  return data;
}

export interface ClearLoadoutRequest {
  loadoutIndex: number;
  characterId: string;
  membershipType: number;
}

export async function clearLoadout(request: ClearLoadoutRequest, accessToken: string): Promise<any> {
  const body = {
    loadoutIndex: request.loadoutIndex,
    characterId: request.characterId,
    membershipType: request.membershipType,
  };

  const res = await fetch(`${BUNGIE_BASE}/Platform/Destiny2/Actions/Loadouts/ClearLoadout/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': BUNGIE_API_KEY || '',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (data.ErrorCode !== 1) {
    throw new Error(data.Message || `Clear loadout failed: ${data.ErrorStatus}`);
  }
  return data;
}

export async function fetchMembershipsRaw(accessToken: string) {
  return bungieGet('/Platform/User/GetMembershipsForCurrentUser/', accessToken);
}
