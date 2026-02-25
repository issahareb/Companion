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
};

const VAULT_BUCKET = 138197802;
const POSTMASTER_BUCKET = 215938771;
const QUEST_BUCKET = 1345459588;
const PURSUITS_BUCKET = 1345459588;

const WEAPON_SLOTS = ['kinetic', 'energy', 'power'];
const ARMOR_SLOTS = ['helmet', 'arms', 'chest', 'legs', 'class'];

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

interface ManifestCache {
  version: string;
  items: Record<string, ManifestItem>;
  collectibles: Record<string, CollectibleDef>;
  records: Record<string, RecordDef>;
  progressions: Record<string, ProgressionDef>;
  objectives: Record<string, ObjectiveDef>;
  activities: Record<string, ActivityDef>;
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

  const [itemDefs, collectibleDefs, recordDefs, progressionDefs, objectiveDefs, activityDefs] = await Promise.all([
    fetch(`${BUNGIE_BASE}${paths.DestinyInventoryItemDefinition}`).then(r => r.json()),
    fetch(`${BUNGIE_BASE}${paths.DestinyCollectibleDefinition}`).then(r => r.json()).catch(() => ({})),
    fetch(`${BUNGIE_BASE}${paths.DestinyRecordDefinition}`).then(r => r.json()).catch(() => ({})),
    fetch(`${BUNGIE_BASE}${paths.DestinyProgressionDefinition}`).then(r => r.json()).catch(() => ({})),
    fetch(`${BUNGIE_BASE}${paths.DestinyObjectiveDefinition}`).then(r => r.json()).catch(() => ({})),
    fetch(`${BUNGIE_BASE}${paths.DestinyActivityDefinition}`).then(r => r.json()).catch(() => ({})),
  ]);

  const items: Record<string, ManifestItem> = {};
  for (const [hash, def] of Object.entries(itemDefs) as [string, any][]) {
    if (!def.displayProperties?.name) continue;
    const bucketHash = def.inventory?.bucketTypeHash;
    if (!bucketHash) continue;

    const isGear = !!GEAR_BUCKET_TO_SLOT[bucketHash];
    const isQuest = bucketHash === QUEST_BUCKET || bucketHash === PURSUITS_BUCKET;
    const isCurrency = !!CURRENCY_HASHES[Number(hash)];

    if (!isGear && !isQuest && !isCurrency && bucketHash !== POSTMASTER_BUCKET) continue;

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

  manifestCache = { version: manifestVersion, items, collectibles, records, progressions, objectives, activities, fetchedAt: Date.now() };
  console.log(`[bungie] Manifest cached: ${Object.keys(items).length} items, ${Object.keys(collectibles).length} collectibles, ${Object.keys(records).length} records`);
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

export interface ProfileState {
  characters: CharacterData[];
  vaultItems: InventoryItem[];
  postmasterItems: InventoryItem[];
  currencies: CurrencyInfo[];
  collectibles: CollectibleItem[];
  records: RecordItem[];
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
  if (!slot) return null;

  const rarity = TIER_TO_RARITY[manifestItem.tierTypeName] || 'common';

  const instanceId = item.itemInstanceId || hashStr;
  const instance = item.itemInstanceId ? instanceDetails[item.itemInstanceId] : null;

  return {
    id: instanceId,
    itemHash: item.itemHash,
    name: manifestItem.name,
    type: manifestItem.type,
    slot,
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
  if (socketData?.sockets) {
    item.mods = socketData.sockets
      .filter((s: any) => s.plugHash && s.isEnabled)
      .slice(0, 6)
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
      `/Platform/Destiny2/${membershipType}/Profile/${membershipId}/?components=100,102,103,200,201,202,205,300,302,304,800,900`,
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
          attachPerksAndMods(parsed, itemPerks, itemSockets, manifestData);
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
          attachPerksAndMods(parsed, itemPerks, itemSockets, manifestData);
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
          if (parsed) postmasterItems.push(parsed);
          continue;
        }

        if (manifestItem.bucketHash === QUEST_BUCKET) {
          continue;
        }

        const parsed = parseGearItem(item, manifest, instanceDetails, 'character', charId);
        if (parsed) {
          attachPerksAndMods(parsed, itemPerks, itemSockets, manifestData);
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

  return { characters, vaultItems, postmasterItems, currencies, collectibles, records };
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

export async function fetchMembershipsRaw(accessToken: string) {
  return bungieGet('/Platform/User/GetMembershipsForCurrentUser/', accessToken);
}
