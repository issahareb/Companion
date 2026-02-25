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

interface ManifestCache {
  version: string;
  items: Record<string, ManifestItem>;
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

async function fetchManifest(): Promise<Record<string, ManifestItem>> {
  if (manifestCache && Date.now() - manifestCache.fetchedAt < MANIFEST_TTL) {
    return manifestCache.items;
  }

  console.log('[bungie] Fetching manifest...');
  const manifestData = await bungieGet('/Platform/Destiny2/Manifest/');
  const manifestVersion = manifestData.Response.version;

  if (manifestCache && manifestCache.version === manifestVersion) {
    manifestCache.fetchedAt = Date.now();
    return manifestCache.items;
  }

  const itemDefPath = manifestData.Response.jsonWorldComponentContentPaths.en.DestinyInventoryItemDefinition;
  const itemDefsRes = await fetch(`${BUNGIE_BASE}${itemDefPath}`);
  if (!itemDefsRes.ok) {
    throw new Error('Failed to fetch item definitions');
  }
  const itemDefs = await itemDefsRes.json();

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

  manifestCache = { version: manifestVersion, items, fetchedAt: Date.now() };
  console.log(`[bungie] Manifest cached: ${Object.keys(items).length} relevant items`);
  return items;
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
}

export interface ProfileState {
  characters: CharacterData[];
  vaultItems: InventoryItem[];
  postmasterItems: InventoryItem[];
  currencies: CurrencyInfo[];
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

export async function fetchProfileState(
  membershipType: string,
  membershipId: string,
  accessToken: string
): Promise<ProfileState> {
  const [manifest, profileData] = await Promise.all([
    fetchManifest(),
    bungieGet(
      `/Platform/Destiny2/${membershipType}/Profile/${membershipId}/?components=100,102,103,200,201,205,300`,
      accessToken
    ),
  ]);

  const response = profileData.Response;
  if (!response) {
    throw new Error('No profile data returned from Bungie');
  }

  const instanceDetails = response.itemComponents?.instances?.data || {};

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
        if (parsed) vaultItems.push(parsed);
        else {
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

  for (const [charId, charInfo] of Object.entries(characterData) as [string, any][]) {
    const equipped: InventoryItem[] = [];
    const charEquip = characterEquipment[charId];
    if (charEquip?.items) {
      for (const item of charEquip.items) {
        const parsed = parseGearItem(item, manifest, instanceDetails, 'equipped', charId);
        if (parsed) equipped.push(parsed);
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
        if (parsed) charInventory.push(parsed);
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
    });
  }

  characters.sort((a, b) => new Date(b.dateLastPlayed).getTime() - new Date(a.dateLastPlayed).getTime());
  vaultItems.sort((a, b) => b.power - a.power);

  return { characters, vaultItems, postmasterItems, currencies };
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

export async function fetchMembershipsRaw(accessToken: string) {
  return bungieGet('/Platform/User/GetMembershipsForCurrentUser/', accessToken);
}
