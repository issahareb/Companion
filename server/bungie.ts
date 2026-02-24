const BUNGIE_API_KEY = process.env.BUNGIE_API_KEY;
const BUNGIE_BASE = 'https://www.bungie.net';

if (!BUNGIE_API_KEY) {
  console.warn('[bungie] BUNGIE_API_KEY not set - Bungie API calls will fail');
}

const BUCKET_TO_SLOT: Record<number, string> = {
  1498876634: 'kinetic',
  2465295065: 'energy',
  953998645: 'power',
  3448274439: 'helmet',
  3551918588: 'arms',
  14239492: 'chest',
  20886954: 'legs',
  1585787867: 'class',
};

const TIER_TO_RARITY: Record<string, 'legendary' | 'exotic'> = {
  Exotic: 'exotic',
  Legendary: 'legendary',
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
    if (!bucketHash || !BUCKET_TO_SLOT[bucketHash]) continue;

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

export interface CharacterSummary {
  characterId: string;
  classType: number;
  className: string;
  raceName: string;
  light: number;
  emblemPath: string;
  emblemBackgroundPath: string;
  dateLastPlayed: string;
  equippedItems: InventoryItem[];
}

export async function fetchCharacters(
  membershipType: string,
  membershipId: string,
  accessToken: string
): Promise<CharacterSummary[]> {
  const [manifest, profileData] = await Promise.all([
    fetchManifest(),
    bungieGet(
      `/Platform/Destiny2/${membershipType}/Profile/${membershipId}/?components=200,205,300`,
      accessToken
    ),
  ]);

  const response = profileData.Response;
  if (!response?.characters?.data) {
    throw new Error('No character data returned from Bungie');
  }

  const characters: CharacterSummary[] = [];
  const instanceDetails = response.itemComponents?.instances?.data || {};
  const characterEquipment = response.characterEquipment?.data || {};

  for (const [charId, charData] of Object.entries(response.characters.data) as [string, any][]) {
    const equipped: InventoryItem[] = [];
    const charEquip = characterEquipment[charId];
    if (charEquip?.items) {
      for (const item of charEquip.items) {
        const hashStr = String(item.itemHash);
        const manifestItem = manifest[hashStr];
        if (!manifestItem) continue;
        const slot = BUCKET_TO_SLOT[manifestItem.bucketHash];
        if (!slot) continue;
        const rarity = TIER_TO_RARITY[manifestItem.tierTypeName];
        if (!rarity) continue;
        const instance = item.itemInstanceId ? instanceDetails[item.itemInstanceId] : null;
        equipped.push({
          id: item.itemInstanceId || hashStr,
          itemHash: item.itemHash,
          name: manifestItem.name,
          type: manifestItem.type,
          slot,
          rarity,
          power: instance?.primaryStat?.value || 0,
          icon: manifestItem.icon,
          screenshot: manifestItem.screenshot,
        });
      }
    }

    characters.push({
      characterId: charId,
      classType: charData.classType,
      className: CLASS_NAMES[charData.classType] || 'Unknown',
      raceName: RACE_NAMES[charData.raceType] || 'Unknown',
      light: charData.light || 0,
      emblemPath: charData.emblemPath ? `${BUNGIE_BASE}${charData.emblemPath}` : '',
      emblemBackgroundPath: charData.emblemBackgroundPath ? `${BUNGIE_BASE}${charData.emblemBackgroundPath}` : '',
      dateLastPlayed: charData.dateLastPlayed || '',
      equippedItems: equipped,
    });
  }

  characters.sort((a, b) => new Date(b.dateLastPlayed).getTime() - new Date(a.dateLastPlayed).getTime());
  return characters;
}

export interface InventoryItem {
  id: string;
  itemHash: number;
  name: string;
  type: string;
  slot: string;
  screenshot: string;
  rarity: 'legendary' | 'exotic';
  power: number;
  icon: string;
}

export async function fetchInventory(
  membershipType: string,
  membershipId: string,
  accessToken: string
): Promise<InventoryItem[]> {
  const [manifest, profileData] = await Promise.all([
    fetchManifest(),
    bungieGet(
      `/Platform/Destiny2/${membershipType}/Profile/${membershipId}/?components=102,200,201,205,300`,
      accessToken
    ),
  ]);

  const response = profileData.Response;
  if (!response) {
    throw new Error('No profile data returned from Bungie');
  }

  const instanceDetails = response.itemComponents?.instances?.data || {};

  const allItems: Array<{ itemHash: number; itemInstanceId?: string }> = [];

  const profileInventory = response.profileInventory?.data?.items;
  if (profileInventory) {
    allItems.push(...profileInventory);
  }

  const characterInventories = response.characterInventories?.data;
  if (characterInventories) {
    for (const charItems of Object.values(characterInventories) as any[]) {
      if (charItems?.items) {
        allItems.push(...charItems.items);
      }
    }
  }

  const characterEquipment = response.characterEquipment?.data;
  if (characterEquipment) {
    for (const charEquip of Object.values(characterEquipment) as any[]) {
      if (charEquip?.items) {
        allItems.push(...charEquip.items);
      }
    }
  }

  const seenIds = new Set<string>();
  const inventory: InventoryItem[] = [];

  for (const item of allItems) {
    const hashStr = String(item.itemHash);
    const manifestItem = manifest[hashStr];
    if (!manifestItem) continue;

    const slot = BUCKET_TO_SLOT[manifestItem.bucketHash];
    if (!slot) continue;

    const rarity = TIER_TO_RARITY[manifestItem.tierTypeName];
    if (!rarity) continue;

    const instanceId = item.itemInstanceId || hashStr;
    if (seenIds.has(instanceId)) continue;
    seenIds.add(instanceId);

    const instance = item.itemInstanceId ? instanceDetails[item.itemInstanceId] : null;
    const power = instance?.primaryStat?.value || 0;

    inventory.push({
      id: instanceId,
      itemHash: item.itemHash,
      name: manifestItem.name,
      type: manifestItem.type,
      slot,
      rarity,
      power,
      icon: manifestItem.icon,
      screenshot: manifestItem.screenshot,
    });
  }

  inventory.sort((a, b) => b.power - a.power);

  return inventory;
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
