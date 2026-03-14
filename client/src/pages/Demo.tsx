import { useState, useEffect, useMemo } from 'react';
import { 
  Settings, Share2, Search, Crosshair, Menu,
  Zap, Flame, Hexagon, Shield, Check, Archive,
  Sparkles, Activity, Loader2, AlertTriangle, RefreshCw,
  Users, ArrowRightLeft, Trash2, X, Package, Mail,
  ChevronDown, ChevronUp, Filter, SlidersHorizontal, Coins,
  Plus, Sword, ShieldHalf, Orbit, Eye, ScrollText,
  BookOpen, Trophy, TrendingUp, Lock, Unlock, Download, LogOut
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import hunterBgImg from '@assets/IMG_0576_1772037013335.jpeg';
import warlockBgImg from '@assets/IMG_0577_1772043445515.jpeg';
import titanBgImg from '@assets/IMG_0673_1772205996067.png';
import ggLogoImg from '@assets/IMG_0608_1772051654559.png';

import { DesktopNavButton, MobileNavButton, UserProfile } from '@/components/Navigation';
import { ItemCard, EquippedSlot, type Item, type SlotInfo } from '@/components/Inventory';
import { SaveLoadoutModal } from '@/components/SaveLoadoutModal';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
import { rateWeaponRoll, type RollResult } from '@/lib/roll-ratings';
import type { InventoryItem, CharacterData, CurrencyInfo, QuestItem, CollectibleItem, RecordItem, ProgressionInfo, SocketInfo, ArtifactInfo } from '@/hooks/use-profile-state';

type TabType = 'characters' | 'vault' | 'loadouts' | 'postmaster' | 'collections' | 'triumphs' | 'season';

function toItem(inv: InventoryItem): Item {
  return {
    id: inv.id,
    itemHash: inv.itemHash,
    name: inv.name,
    type: inv.type,
    slot: inv.slot,
    screenshot: inv.screenshot,
    rarity: (inv.rarity === 'exotic' || inv.rarity === 'legendary') ? inv.rarity : 'legendary',
    power: inv.power,
    icon: inv.icon,
  };
}

const B = 'https://www.bungie.net';

function mkItem(id: string, hash: number, name: string, type: string, slot: string, power: number, rarity: string, icon: string, screenshot: string, location: 'equipped' | 'character' | 'vault' | 'postmaster' = 'equipped', perks: any[] = [], mods: any[] = []): InventoryItem {
  return { id, itemHash: hash, name, type, slot, power, rarity, icon: B + icon, screenshot: B + screenshot, location, perks, mods, characterId: 'char-1' };
}

function mkPerk(name: string, active = true) {
  return { hash: Math.random() * 999999 | 0, name, icon: '', description: '', isActive: active };
}

function mkMod(name: string) {
  return { plugHash: Math.random() * 999999 | 0, name, icon: '', description: '' };
}

const DEMO_WEAPONS_EQUIPPED: InventoryItem[] = [
  mkItem('w1', 1001, 'Ace of Spades', 'Hand Cannon', 'kinetic', 2010, 'exotic',
    '/common/destiny2_content/icons/69571b461490608ad098751c57ad3a4e.jpg',
    '/common/destiny2_content/screenshots/1474735408_1.jpg',
    'equipped',
    [mkPerk('Memento Mori'), mkPerk('Firefly'), mkPerk('Outlaw')],
    [mkMod('Backup Mag')]
  ),
  mkItem('w2', 1002, 'Graviton Lance', 'Pulse Rifle', 'energy', 2005, 'exotic',
    '/common/destiny2_content/icons/de9b6e0db8ea72f30e49c1eab34e5599.jpg',
    '/common/destiny2_content/screenshots/3628991658_1.jpg',
    'equipped',
    [mkPerk('Black Hole'), mkPerk('Cosmology')],
    []
  ),
  mkItem('w3', 1003, 'Apex Predator', 'Rocket Launcher', 'power', 2008, 'legendary',
    '/common/destiny2_content/icons/c67a8bab0898b0e6a3d60a7cd206e981.jpg',
    '/common/destiny2_content/screenshots/2545083870_1.jpg',
    'equipped',
    [mkPerk('Vorpal Weapon'), mkPerk('Auto-Loading Holster'), mkPerk('Bait and Switch')],
    [mkMod('Boss Spec')]
  ),
];

const DEMO_ARMOR_EQUIPPED: InventoryItem[] = [
  mkItem('a1', 2001, 'Celestial Nighthawk', 'Helmet', 'helmet', 2010, 'exotic',
    '/common/destiny2_content/icons/9a0a0e29aea21af0be90f1fa85bc91d4.jpg',
    '/common/destiny2_content/screenshots/3381020835_1.jpg', 'equipped'
  ),
  mkItem('a2', 2002, 'Iron Forerunner Grips', 'Gauntlets', 'arms', 1998, 'legendary',
    '/common/destiny2_content/icons/e09a8d93e8dc0a9fceea8267a31d68ff.jpg',
    '/common/destiny2_content/screenshots/1303455820_1.jpg', 'equipped'
  ),
  mkItem('a3', 2003, 'Nemean Cuirass', 'Chest Armor', 'chest', 2004, 'legendary',
    '/common/destiny2_content/icons/b73cde9e455ed3bbb02fe3b21f8d2f47.jpg',
    '/common/destiny2_content/screenshots/965643015_1.jpg', 'equipped'
  ),
  mkItem('a4', 2004, 'Nemean Strides', 'Leg Armor', 'legs', 2006, 'legendary',
    '/common/destiny2_content/icons/b73cde9e455ed3bbb02fe3b21f8d2f47.jpg',
    '/common/destiny2_content/screenshots/965643015_1.jpg', 'equipped'
  ),
  mkItem('a5', 2005, 'Cinder Pinion Cloak', 'Hunter Cloak', 'class', 2002, 'legendary',
    '/common/destiny2_content/icons/97d3148b3a385bb7a820a1fc3cbb1795.jpg',
    '/common/destiny2_content/screenshots/3351318945_1.jpg', 'equipped'
  ),
];

const DEMO_SUBCLASS: InventoryItem = {
  id: 'sub1', itemHash: 3001, name: 'Gunslinger', type: 'Solar', slot: 'subclass',
  power: 0, rarity: 'legendary',
  icon: B + '/common/destiny2_content/icons/1269daea1c8b58ef10306971ef3e7331.png',
  screenshot: '', location: 'equipped', characterId: 'char-1',
  sockets: [
    { socketIndex: 0, plugHash: 10, name: 'Golden Gun - Marksman', icon: B + '/common/destiny2_content/icons/1269daea1c8b58ef10306971ef3e7331.png', description: 'Summon a precision firearm.', reusablePlugs: [
      { plugHash: 10, name: 'Golden Gun - Marksman', icon: B + '/common/destiny2_content/icons/1269daea1c8b58ef10306971ef3e7331.png', description: 'Precision', canInsert: true },
      { plugHash: 11, name: 'Blade Barrage', icon: B + '/common/destiny2_content/icons/1269daea1c8b58ef10306971ef3e7331.png', description: 'Throw knives', canInsert: true },
    ]},
    { socketIndex: 1, plugHash: 20, name: 'Marksman Dodge', icon: '', description: 'Dodge to reload.', reusablePlugs: [] },
    { socketIndex: 2, plugHash: 30, name: 'Triple Jump', icon: '', description: 'Jump 3 times.', reusablePlugs: [] },
    { socketIndex: 3, plugHash: 40, name: 'Knife Trick', icon: '', description: 'Throw a fan of knives.', reusablePlugs: [] },
    { socketIndex: 4, plugHash: 50, name: 'Solar Grenade', icon: '', description: 'A lingering grenade.', reusablePlugs: [] },
  ],
};

const DEMO_INVENTORY: InventoryItem[] = [
  mkItem('inv1', 3001, 'The Last Word', 'Hand Cannon', 'kinetic', 1990, 'exotic',
    '/common/destiny2_content/icons/de55c53fb0cde6bf8b51a9e32a755c22.jpg',
    '/common/destiny2_content/screenshots/1364093401_1.jpg', 'character',
    [mkPerk('Vorpal Weapon'), mkPerk('Rangefinder'), mkPerk('Incandescent')], []
  ),
  mkItem('inv2', 3002, 'Fatebringer (Timelost)', 'Hand Cannon', 'kinetic', 2005, 'legendary',
    '/common/destiny2_content/icons/c67a8bab0898b0e6a3d60a7cd206e981.jpg',
    '/common/destiny2_content/screenshots/2545083870_1.jpg', 'character',
    [mkPerk('Explosive Payload'), mkPerk('Frenzy'), mkPerk('Rapid Hit')], []
  ),
  mkItem('inv3', 3003, 'Beloved', 'Sniper Rifle', 'energy', 1995, 'legendary',
    '/common/destiny2_content/icons/e09a8d93e8dc0a9fceea8267a31d68ff.jpg',
    '/common/destiny2_content/screenshots/1303455820_1.jpg', 'character',
    [mkPerk('Snapshot Sights'), mkPerk('Vorpal Weapon')], []
  ),
  mkItem('inv4', 3004, 'Falling Guillotine', 'Sword', 'power', 2000, 'legendary',
    '/common/destiny2_content/icons/b73cde9e455ed3bbb02fe3b21f8d2f47.jpg',
    '/common/destiny2_content/screenshots/965643015_1.jpg', 'character',
    [mkPerk('Whirlwind Blade'), mkPerk('Relentless Strikes')], []
  ),
];

const DEMO_VAULT: InventoryItem[] = [
  mkItem('v1', 4001, 'Witherhoard', 'Grenade Launcher', 'kinetic', 2010, 'exotic',
    '/common/destiny2_content/icons/de55c53fb0cde6bf8b51a9e32a755c22.jpg',
    '/common/destiny2_content/screenshots/1364093401_1.jpg', 'vault',
    [mkPerk('Vorpal Weapon'), mkPerk('Auto-Loading Holster')], []
  ),
  mkItem('v2', 4002, 'Reed\'s Regret', 'Linear Fusion Rifle', 'power', 2008, 'legendary',
    '/common/destiny2_content/icons/c67a8bab0898b0e6a3d60a7cd206e981.jpg',
    '/common/destiny2_content/screenshots/2545083870_1.jpg', 'vault',
    [mkPerk('Firing Line'), mkPerk('Triple Tap'), mkPerk('Vorpal Weapon')], []
  ),
  mkItem('v3', 4003, 'Ikelos SMG', 'Submachine Gun', 'energy', 2002, 'legendary',
    '/common/destiny2_content/icons/e09a8d93e8dc0a9fceea8267a31d68ff.jpg',
    '/common/destiny2_content/screenshots/1303455820_1.jpg', 'vault',
    [mkPerk('Subsistence'), mkPerk('Frenzy'), mkPerk('Incandescent')], []
  ),
  mkItem('v4', 4004, 'Forbearance', 'Grenade Launcher', 'energy', 2006, 'legendary',
    '/common/destiny2_content/icons/97d3148b3a385bb7a820a1fc3cbb1795.jpg',
    '/common/destiny2_content/screenshots/3351318945_1.jpg', 'vault',
    [mkPerk('Chain Reaction'), mkPerk('Demolitionist')], []
  ),
  mkItem('v5', 4005, 'Gjallarhorn', 'Rocket Launcher', 'power', 2010, 'exotic',
    '/common/destiny2_content/icons/9a0a0e29aea21af0be90f1fa85bc91d4.jpg',
    '/common/destiny2_content/screenshots/3381020835_1.jpg', 'vault',
    [mkPerk('Vorpal Weapon'), mkPerk('Lasting Impression'), mkPerk('Chain Reaction')], []
  ),
  mkItem('v6', 4006, 'Austringer', 'Hand Cannon', 'kinetic', 1998, 'legendary',
    '/common/destiny2_content/icons/b73cde9e455ed3bbb02fe3b21f8d2f47.jpg',
    '/common/destiny2_content/screenshots/965643015_1.jpg', 'vault',
    [mkPerk('Rampage'), mkPerk('Outlaw')], []
  ),
  mkItem('v7', 4007, 'Stormchaser', 'Linear Fusion Rifle', 'power', 2004, 'legendary',
    '/common/destiny2_content/icons/de9b6e0db8ea72f30e49c1eab34e5599.jpg',
    '/common/destiny2_content/screenshots/3628991658_1.jpg', 'vault',
    [mkPerk('Firing Line'), mkPerk('Fourth Time\'s the Charm'), mkPerk('Rapid Hit')], []
  ),
  mkItem('v8', 4008, 'Calus Mini-Tool', 'Submachine Gun', 'energy', 1996, 'legendary',
    '/common/destiny2_content/icons/c67a8bab0898b0e6a3d60a7cd206e981.jpg',
    '/common/destiny2_content/screenshots/2545083870_1.jpg', 'vault',
    [mkPerk('Incandescent'), mkPerk('Subsistence')], []
  ),
];

const DEMO_POSTMASTER: InventoryItem[] = [
  { ...mkItem('pm1', 5001, 'Enhancement Prism', 'Material', 'materials', 0, 'legendary',
    '/common/destiny2_content/icons/97d3148b3a385bb7a820a1fc3cbb1795.jpg', '', 'postmaster'), characterId: 'char-1' },
  { ...mkItem('pm2', 5002, 'Herealways Piece', 'Material', 'materials', 0, 'rare',
    '/common/destiny2_content/icons/e09a8d93e8dc0a9fceea8267a31d68ff.jpg', '', 'postmaster'), characterId: 'char-1' },
];

const DEMO_QUESTS: QuestItem[] = [
  { id: 'q1', itemHash: 6001, name: 'The Witch Queen', description: 'Investigate Savathûn\'s Throne World.', type: 'Quest', icon: B + '/common/destiny2_content/icons/de55c53fb0cde6bf8b51a9e32a755c22.jpg' },
  { id: 'q2', itemHash: 6002, name: 'Exo Challenge', description: 'Complete the simulation.', type: 'Quest', icon: B + '/common/destiny2_content/icons/c67a8bab0898b0e6a3d60a7cd206e981.jpg' },
];

const DEMO_STATS = [
  { name: 'Mobility', value: 102, icon: B + '/common/destiny2_content/icons/e26e0e93a3c02f5b0e6c5002b0ee0f86.png', description: 'Movement speed and jump height.' },
  { name: 'Resilience', value: 68, icon: B + '/common/destiny2_content/icons/202ecc1c6f1c53b19c1cfe309e3f7f1a.png', description: 'Shield and damage resistance.' },
  { name: 'Recovery', value: 45, icon: B + '/common/destiny2_content/icons/128eee4ee7fc127851ab32eac6ca26f9.png', description: 'Health regeneration speed.' },
  { name: 'Discipline', value: 200, icon: B + '/common/destiny2_content/icons/79be2d4adef6a19203f7f76e3b78f8d7.png', description: 'Grenade recharge rate.' },
  { name: 'Intellect', value: 80, icon: B + '/common/destiny2_content/icons/59732534ce7060dba681c1a4c3d5e56a.png', description: 'Super recharge rate.' },
  { name: 'Strength', value: 35, icon: B + '/common/destiny2_content/icons/c7eefc8abbaa586eeab79e962a79d6ad.png', description: 'Melee recharge rate.' },
];

const DEMO_CURRENCIES: CurrencyInfo[] = [
  { itemHash: 7001, name: 'Glimmer', quantity: 237845, icon: B + '/common/destiny2_content/icons/78f57da0bc15b47c77e0794e0be1b9d0.png' },
  { itemHash: 7002, name: 'Legendary Shards', quantity: 4523, icon: B + '/common/destiny2_content/icons/5cfeae7a37d5671dcf05600dc7bfaf0d.png' },
  { itemHash: 7003, name: 'Bright Dust', quantity: 12680, icon: B + '/common/destiny2_content/icons/697d0d36a3b085e2b64c99eaef302aef.png' },
];

const DEMO_COLLECTIBLES: CollectibleItem[] = [
  { collectibleHash: 8001, name: 'Ace of Spades', description: 'Cayde\'s weapon.', icon: B + '/common/destiny2_content/icons/69571b461490608ad098751c57ad3a4e.jpg', acquired: true, sourceString: 'Exotic Quest' },
  { collectibleHash: 8002, name: 'Gjallarhorn', description: 'The wolf pack rounds.', icon: B + '/common/destiny2_content/icons/9a0a0e29aea21af0be90f1fa85bc91d4.jpg', acquired: true, sourceString: 'Grasp of Avarice' },
  { collectibleHash: 8003, name: 'Vex Mythoclast', description: 'A Vex relic.', icon: B + '/common/destiny2_content/icons/de9b6e0db8ea72f30e49c1eab34e5599.jpg', acquired: false, sourceString: 'Vault of Glass' },
  { collectibleHash: 8004, name: 'Touch of Malice', description: 'Ancient relic.', icon: B + '/common/destiny2_content/icons/de55c53fb0cde6bf8b51a9e32a755c22.jpg', acquired: true, sourceString: 'King\'s Fall' },
  { collectibleHash: 8005, name: 'Collective Obligation', description: 'Unknown origins.', icon: B + '/common/destiny2_content/icons/c67a8bab0898b0e6a3d60a7cd206e981.jpg', acquired: false, sourceString: 'Vow of the Disciple' },
  { collectibleHash: 8006, name: 'Divinity', description: 'Trace of light.', icon: B + '/common/destiny2_content/icons/e09a8d93e8dc0a9fceea8267a31d68ff.jpg', acquired: true, sourceString: 'Garden of Salvation' },
];

const DEMO_RECORDS: RecordItem[] = [
  { recordHash: 9001, name: 'Flawless Raider', description: 'Complete a raid without dying.', icon: B + '/common/destiny2_content/icons/de55c53fb0cde6bf8b51a9e32a755c22.jpg', completed: true, scoreValue: 500, objectives: [] },
  { recordHash: 9002, name: 'Conqueror', description: 'Complete all Grandmaster Nightfalls.', icon: B + '/common/destiny2_content/icons/c67a8bab0898b0e6a3d60a7cd206e981.jpg', completed: false, scoreValue: 1000, objectives: [
    { description: 'Nightfalls completed', progress: 4, completionValue: 6, complete: false },
  ]},
  { recordHash: 9003, name: 'Discerptor', description: 'Complete Vow challenges.', icon: B + '/common/destiny2_content/icons/9a0a0e29aea21af0be90f1fa85bc91d4.jpg', completed: true, scoreValue: 250, objectives: [] },
];

const DEMO_PROGRESSIONS: ProgressionInfo[] = [
  { progressionHash: 10001, name: 'Vanguard', level: 16, progressToNextLevel: 8400, nextLevelAt: 10000, currentResetCount: 2, icon: B + '/common/destiny2_content/icons/de55c53fb0cde6bf8b51a9e32a755c22.jpg' },
  { progressionHash: 10002, name: 'Crucible', level: 12, progressToNextLevel: 3200, nextLevelAt: 10000, currentResetCount: 1, icon: B + '/common/destiny2_content/icons/c67a8bab0898b0e6a3d60a7cd206e981.jpg' },
  { progressionHash: 10003, name: 'Gambit', level: 8, progressToNextLevel: 5600, nextLevelAt: 10000, currentResetCount: 0, icon: B + '/common/destiny2_content/icons/e09a8d93e8dc0a9fceea8267a31d68ff.jpg' },
];

const DEMO_ARTIFACT: ArtifactInfo = {
  name: 'Queensfoil Censer',
  icon: B + '/common/destiny2_content/icons/97d3148b3a385bb7a820a1fc3cbb1795.jpg',
  powerBonus: 14,
  pointsUsed: 10,
  pointsAvailable: 12,
  tiers: [
    { items: [
      { itemHash: 11001, name: 'Anti-Barrier Auto Rifle', icon: B + '/common/destiny2_content/icons/de55c53fb0cde6bf8b51a9e32a755c22.jpg', isActive: true },
      { itemHash: 11002, name: 'Unstoppable Pulse Rifle', icon: B + '/common/destiny2_content/icons/c67a8bab0898b0e6a3d60a7cd206e981.jpg', isActive: true },
    ]},
    { items: [
      { itemHash: 11003, name: 'Molten Overload', icon: B + '/common/destiny2_content/icons/e09a8d93e8dc0a9fceea8267a31d68ff.jpg', isActive: true },
    ]},
  ],
};

const demoCharacters: CharacterData[] = [
  {
    characterId: 'char-1',
    classType: 1,
    className: 'Hunter',
    raceName: 'Awoken',
    light: 2010,
    emblemPath: B + '/common/destiny2_content/icons/de55c53fb0cde6bf8b51a9e32a755c22.jpg',
    emblemBackgroundPath: B + '/common/destiny2_content/icons/69571b461490608ad098751c57ad3a4e.jpg',
    dateLastPlayed: '2026-02-27T10:00:00Z',
    stats: DEMO_STATS,
    equippedItems: [...DEMO_WEAPONS_EQUIPPED, ...DEMO_ARMOR_EQUIPPED, DEMO_SUBCLASS],
    inventory: DEMO_INVENTORY,
    quests: DEMO_QUESTS,
    progressions: DEMO_PROGRESSIONS,
  },
  {
    characterId: 'char-2',
    classType: 0,
    className: 'Titan',
    raceName: 'Exo',
    light: 2005,
    emblemPath: B + '/common/destiny2_content/icons/c67a8bab0898b0e6a3d60a7cd206e981.jpg',
    emblemBackgroundPath: B + '/common/destiny2_content/icons/de9b6e0db8ea72f30e49c1eab34e5599.jpg',
    dateLastPlayed: '2026-02-26T15:00:00Z',
    stats: [
      { name: 'Mobility', value: 40, icon: B + '/common/destiny2_content/icons/e26e0e93a3c02f5b0e6c5002b0ee0f86.png', description: '' },
      { name: 'Resilience', value: 200, icon: B + '/common/destiny2_content/icons/202ecc1c6f1c53b19c1cfe309e3f7f1a.png', description: '' },
      { name: 'Recovery', value: 70, icon: B + '/common/destiny2_content/icons/128eee4ee7fc127851ab32eac6ca26f9.png', description: '' },
      { name: 'Discipline', value: 55, icon: B + '/common/destiny2_content/icons/79be2d4adef6a19203f7f76e3b78f8d7.png', description: '' },
      { name: 'Intellect', value: 90, icon: B + '/common/destiny2_content/icons/59732534ce7060dba681c1a4c3d5e56a.png', description: '' },
      { name: 'Strength', value: 100, icon: B + '/common/destiny2_content/icons/c7eefc8abbaa586eeab79e962a79d6ad.png', description: '' },
    ],
    equippedItems: [
      mkItem('tw1', 1101, 'Outbreak Perfected', 'Pulse Rifle', 'kinetic', 2005, 'exotic',
        '/common/destiny2_content/icons/de9b6e0db8ea72f30e49c1eab34e5599.jpg',
        '/common/destiny2_content/screenshots/3628991658_1.jpg', 'equipped',
        [mkPerk('Desperado'), mkPerk('Kill Clip')], []
      ),
      mkItem('tw2', 1102, 'IKELOS SMG', 'Submachine Gun', 'energy', 2000, 'legendary',
        '/common/destiny2_content/icons/e09a8d93e8dc0a9fceea8267a31d68ff.jpg',
        '/common/destiny2_content/screenshots/1303455820_1.jpg', 'equipped',
        [mkPerk('Voltshot'), mkPerk('Subsistence')], []
      ),
      mkItem('tw3', 1103, 'Cataclysmic', 'Linear Fusion Rifle', 'power', 2008, 'legendary',
        '/common/destiny2_content/icons/c67a8bab0898b0e6a3d60a7cd206e981.jpg',
        '/common/destiny2_content/screenshots/2545083870_1.jpg', 'equipped',
        [mkPerk('Bait and Switch'), mkPerk('Fourth Time\'s the Charm'), mkPerk('Reconstruction')], []
      ),
      mkItem('ta1', 2101, 'Helm of Saint-14', 'Helmet', 'helmet', 2010, 'exotic',
        '/common/destiny2_content/icons/9a0a0e29aea21af0be90f1fa85bc91d4.jpg',
        '/common/destiny2_content/screenshots/3381020835_1.jpg', 'equipped'
      ),
      mkItem('ta2', 2102, 'Iron Forerunner Gauntlets', 'Gauntlets', 'arms', 2000, 'legendary',
        '/common/destiny2_content/icons/e09a8d93e8dc0a9fceea8267a31d68ff.jpg', '', 'equipped'),
      mkItem('ta3', 2103, 'Plate of the Exile', 'Chest Armor', 'chest', 2003, 'legendary',
        '/common/destiny2_content/icons/b73cde9e455ed3bbb02fe3b21f8d2f47.jpg', '', 'equipped'),
      mkItem('ta4', 2104, 'Iron Forerunner Greaves', 'Leg Armor', 'legs', 2001, 'legendary',
        '/common/destiny2_content/icons/c67a8bab0898b0e6a3d60a7cd206e981.jpg', '', 'equipped'),
      mkItem('ta5', 2105, 'Titan Mark', 'Titan Mark', 'class', 1999, 'legendary',
        '/common/destiny2_content/icons/97d3148b3a385bb7a820a1fc3cbb1795.jpg', '', 'equipped'),
    ],
    inventory: [],
    quests: [],
    progressions: DEMO_PROGRESSIONS,
  },
  {
    characterId: 'char-3',
    classType: 2,
    className: 'Warlock',
    raceName: 'Human',
    light: 1995,
    emblemPath: B + '/common/destiny2_content/icons/e09a8d93e8dc0a9fceea8267a31d68ff.jpg',
    emblemBackgroundPath: B + '/common/destiny2_content/icons/b73cde9e455ed3bbb02fe3b21f8d2f47.jpg',
    dateLastPlayed: '2026-02-25T20:00:00Z',
    stats: [
      { name: 'Mobility', value: 30, icon: B + '/common/destiny2_content/icons/e26e0e93a3c02f5b0e6c5002b0ee0f86.png', description: '' },
      { name: 'Resilience', value: 50, icon: B + '/common/destiny2_content/icons/202ecc1c6f1c53b19c1cfe309e3f7f1a.png', description: '' },
      { name: 'Recovery', value: 200, icon: B + '/common/destiny2_content/icons/128eee4ee7fc127851ab32eac6ca26f9.png', description: '' },
      { name: 'Discipline', value: 103, icon: B + '/common/destiny2_content/icons/79be2d4adef6a19203f7f76e3b78f8d7.png', description: '' },
      { name: 'Intellect', value: 62, icon: B + '/common/destiny2_content/icons/59732534ce7060dba681c1a4c3d5e56a.png', description: '' },
      { name: 'Strength', value: 18, icon: B + '/common/destiny2_content/icons/c7eefc8abbaa586eeab79e962a79d6ad.png', description: '' },
    ],
    equippedItems: [
      mkItem('ww1', 1201, 'Osteo Striga', 'Submachine Gun', 'kinetic', 1995, 'exotic',
        '/common/destiny2_content/icons/de55c53fb0cde6bf8b51a9e32a755c22.jpg',
        '/common/destiny2_content/screenshots/1364093401_1.jpg', 'equipped',
        [mkPerk('Toxic Overload')], []
      ),
      mkItem('ww2', 1202, 'Unforgiven', 'Submachine Gun', 'energy', 1990, 'legendary',
        '/common/destiny2_content/icons/c67a8bab0898b0e6a3d60a7cd206e981.jpg', '', 'equipped',
        [mkPerk('Demolitionist'), mkPerk('Frenzy')], []
      ),
      mkItem('ww3', 1203, 'Hothead', 'Rocket Launcher', 'power', 1998, 'legendary',
        '/common/destiny2_content/icons/b73cde9e455ed3bbb02fe3b21f8d2f47.jpg', '', 'equipped',
        [mkPerk('Auto-Loading Holster'), mkPerk('Explosive Light')], []
      ),
      mkItem('wa1', 2201, 'Necrotic Grip', 'Gauntlets', 'helmet', 1995, 'exotic',
        '/common/destiny2_content/icons/9a0a0e29aea21af0be90f1fa85bc91d4.jpg', '', 'equipped'),
      mkItem('wa2', 2202, 'Opulent Gloves', 'Gauntlets', 'arms', 1990, 'legendary',
        '/common/destiny2_content/icons/e09a8d93e8dc0a9fceea8267a31d68ff.jpg', '', 'equipped'),
      mkItem('wa3', 2203, 'Opulent Robes', 'Chest Armor', 'chest', 1992, 'legendary',
        '/common/destiny2_content/icons/b73cde9e455ed3bbb02fe3b21f8d2f47.jpg', '', 'equipped'),
      mkItem('wa4', 2204, 'Opulent Boots', 'Leg Armor', 'legs', 1994, 'legendary',
        '/common/destiny2_content/icons/c67a8bab0898b0e6a3d60a7cd206e981.jpg', '', 'equipped'),
      mkItem('wa5', 2205, 'Opulent Bond', 'Warlock Bond', 'class', 1991, 'legendary',
        '/common/destiny2_content/icons/97d3148b3a385bb7a820a1fc3cbb1795.jpg', '', 'equipped'),
    ],
    inventory: [],
    quests: [DEMO_QUESTS[0]],
    progressions: DEMO_PROGRESSIONS,
  },
];

interface FilterState {
  search: string;
  slot: string;
  rarity: string;
  minPower: string;
  maxPower: string;
}

function useItemFilter(items: InventoryItem[], filters: FilterState): InventoryItem[] {
  return useMemo(() => {
    return items.filter(item => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        if (!item.name.toLowerCase().includes(q) && !item.type.toLowerCase().includes(q)) return false;
      }
      if (filters.slot !== 'all' && item.slot !== filters.slot) return false;
      if (filters.rarity !== 'all' && item.rarity !== filters.rarity) return false;
      if (filters.minPower && item.power < parseInt(filters.minPower)) return false;
      if (filters.maxPower && item.power > parseInt(filters.maxPower)) return false;
      return true;
    });
  }, [items, filters]);
}

export default function DemoDashboard() {
  const { toast } = useToast();
  const { t } = useI18n();

  const ITEM_SLOTS: SlotInfo[] = [
    { id: 'kinetic', label: t('slot.kinetic'), icon: Crosshair },
    { id: 'energy', label: t('slot.energy'), icon: Zap },
    { id: 'power', label: t('slot.power'), icon: Flame },
    { id: 'helmet', label: t('slot.helmet'), icon: Shield },
    { id: 'arms', label: t('slot.arms'), icon: Shield },
    { id: 'chest', label: t('slot.chest'), icon: Shield },
    { id: 'legs', label: t('slot.legs'), icon: Shield },
    { id: 'class', label: t('slot.class'), icon: Hexagon },
    { id: 'subclass', label: t('slot.subclass'), icon: Orbit },
  ];

  const SLOT_FILTERS = [
    { id: 'all', label: t('filter.all') },
    { id: 'kinetic', label: t('slot.kinetic') },
    { id: 'energy', label: t('slot.energy') },
    { id: 'power', label: t('slot.power') },
    { id: 'helmet', label: t('slot.helmet') },
    { id: 'arms', label: t('slot.arms') },
    { id: 'chest', label: t('slot.chest') },
    { id: 'legs', label: t('slot.legs') },
    { id: 'class', label: t('slot.class') },
  ];

  const RARITY_FILTERS = [
    { id: 'all', label: t('filter.all') },
    { id: 'exotic', label: t('filter.exotic') },
    { id: 'legendary', label: t('filter.legendary') },
  ];

  const TAB_ORDER: TabType[] = ['characters', 'vault', 'loadouts', 'postmaster', 'collections', 'triumphs', 'season'];
  const [activeTab, setActiveTabRaw] = useState<TabType>('characters');
  const [tabDirection, setTabDirection] = useState(0);
  const setActiveTab = (newTab: TabType) => {
    const oldIdx = TAB_ORDER.indexOf(activeTab);
    const newIdx = TAB_ORDER.indexOf(newTab);
    setTabDirection(newIdx > oldIdx ? 1 : -1);
    setActiveTabRaw(newTab);
  };
  const [loadout, setLoadout] = useState<Record<string, Item>>({});
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [showMobileLoadout, setShowMobileLoadout] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('char-1');
  const [vaultFilters, setVaultFilters] = useState<FilterState>({ search: '', slot: 'all', rarity: 'all', minPower: '', maxPower: '' });
  const [slotPickerSlot, setSlotPickerSlot] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [collectionsSearch, setCollectionsSearch] = useState('');
  const [collectionsFilter, setCollectionsFilter] = useState<'all' | 'acquired' | 'notAcquired'>('all');
  const [triumphsSearch, setTriumphsSearch] = useState('');
  const [triumphsFilter, setTriumphsFilter] = useState<'all' | 'completed' | 'incomplete'>('all');

  const characters = demoCharacters;
  const vaultItems = DEMO_VAULT;
  const postmasterItems = DEMO_POSTMASTER;
  const currencies = DEMO_CURRENCIES;
  const collectibles = DEMO_COLLECTIBLES;
  const records = DEMO_RECORDS;

  const selectedCharacter = characters.find(c => c.characterId === selectedCharacterId) || characters[0];

  const filteredVaultItems = useItemFilter(vaultItems, vaultFilters);

  const filteredCollectibles = useMemo(() => {
    return collectibles.filter(c => {
      if (collectionsSearch) {
        const q = collectionsSearch.toLowerCase();
        if (!c.name.toLowerCase().includes(q) && !c.description.toLowerCase().includes(q)) return false;
      }
      if (collectionsFilter === 'acquired' && !c.acquired) return false;
      if (collectionsFilter === 'notAcquired' && c.acquired) return false;
      return true;
    });
  }, [collectibles, collectionsSearch, collectionsFilter]);

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      if (triumphsSearch) {
        const q = triumphsSearch.toLowerCase();
        if (!r.name.toLowerCase().includes(q) && !r.description.toLowerCase().includes(q)) return false;
      }
      if (triumphsFilter === 'completed' && !r.completed) return false;
      if (triumphsFilter === 'incomplete' && r.completed) return false;
      return true;
    });
  }, [records, triumphsSearch, triumphsFilter]);

  const addToLoadout = (item: Item) => {
    setLoadout(prev => {
      const newLoadout = { ...prev };
      if (item.rarity === 'exotic') {
        const isWeapon = ['kinetic', 'energy', 'power'].includes(item.slot);
        Object.values(newLoadout).forEach(eq => {
          if (eq.rarity === 'exotic') {
            const eqIsWeapon = ['kinetic', 'energy', 'power'].includes(eq.slot);
            if (isWeapon === eqIsWeapon) delete newLoadout[eq.slot];
          }
        });
      }
      newLoadout[item.slot] = item;
      return newLoadout;
    });
    toast({ title: t('toast.added'), description: `${item.name} ${t('toast.addedDesc')}`, duration: 2000 });
  };

  const unequipItem = (slotId: string) => {
    setLoadout(prev => { const n = { ...prev }; delete n[slotId]; return n; });
  };

  const tabTitles: Record<TabType, string> = {
    characters: t('nav.characters'),
    vault: t('nav.vault'),
    loadouts: t('nav.loadouts'),
    postmaster: t('nav.postmaster'),
    collections: t('nav.collections'),
    triumphs: t('nav.triumphs'),
    season: t('nav.season'),
  };

  return (
    <div className="h-screen bg-app text-gray-300 font-sans selection:bg-indigo-500/30 flex flex-col md:flex-row overflow-hidden relative">
      <div className="fixed inset-0 pointer-events-none z-0 bg-app-overlay">
        <div className="absolute top-[-15%] left-[-5%] w-[45%] h-[45%] bg-indigo-900/15 blur-[150px] rounded-full animate-pulse-glow" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[40%] h-[40%] bg-purple-900/10 blur-[130px] rounded-full" />
      </div>

      {/* Demo banner */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-amber-600/90 via-amber-500/90 to-amber-600/90 text-black text-center py-1.5 text-[11px] font-bold uppercase tracking-destiny-widest backdrop-blur-sm">
        DEMO MODE — Dummy Data
      </div>

      <aside className="hidden md:flex flex-col w-64 bg-sidebar backdrop-blur-xl border-r border-white/[0.06] shrink-0 z-20 shadow-2xl relative overflow-hidden pt-8">
        <div className="p-6 pb-2 relative">
          <div className="flex items-center space-x-3 mb-6">
            <div className="relative">
              <Hexagon className="w-8 h-8 text-white" strokeWidth={1.5} />
            </div>
            <span className="font-display font-light text-lg tracking-destiny-wide text-white">GUARDIANGRID <span className="text-[var(--color-gold-accent)] text-sm">(Adept)</span></span>
          </div>
        </div>

        {currencies.length > 0 && (
          <div className="px-4 pb-4 flex flex-wrap gap-2">
            {currencies.map(c => (
              <div key={c.itemHash} className="flex items-center gap-1.5 bg-white/5 rounded px-2 py-1" title={c.name}>
                {c.icon && <img src={c.icon} alt="" className="w-4 h-4" />}
                <span className="text-[11px] text-gray-400 font-mono">{c.quantity.toLocaleString('de-DE')}</span>
              </div>
            ))}
          </div>
        )}

        <nav className="flex-1 py-2 flex flex-col space-y-1.5 px-3">
          <DesktopNavButton icon={Users} label="HÜTER" active={activeTab === 'characters'} onClick={() => setActiveTab('characters')} />
          <DesktopNavButton icon={Package} label="TRESOR" active={activeTab === 'vault'} onClick={() => setActiveTab('vault')} />
          <DesktopNavButton icon={Archive} label="LOADOUTS" active={activeTab === 'loadouts'} onClick={() => setActiveTab('loadouts')} />
          <DesktopNavButton icon={Mail} label="POSTMEISTER" active={activeTab === 'postmaster'} onClick={() => setActiveTab('postmaster')} />
          <div className="h-px bg-white/[0.06] my-2" />
          <DesktopNavButton icon={BookOpen} label={t('nav.collections').toUpperCase()} active={activeTab === 'collections'} onClick={() => setActiveTab('collections')} />
          <DesktopNavButton icon={Trophy} label={t('nav.triumphs').toUpperCase()} active={activeTab === 'triumphs'} onClick={() => setActiveTab('triumphs')} />
          <DesktopNavButton icon={TrendingUp} label={t('nav.season').toUpperCase()} active={activeTab === 'season'} onClick={() => setActiveTab('season')} />
        </nav>
        <div className="p-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white font-bold text-sm">DM</div>
            <div>
              <p className="text-[11px] text-white font-medium tracking-wider">DemoGuardian</p>
              <p className="text-[11px] text-gray-500 uppercase tracking-widest">Demo Mode</p>
            </div>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full relative overflow-hidden z-10 pt-7">
        <div className="h-10 border-b border-white/[0.06] bg-[#060a14] flex items-center px-4 md:px-8 shrink-0 z-10">
          <div className="flex items-center gap-2.5">
            <img src={ggLogoImg} alt="GG" className="h-6 mix-blend-screen" />
            <span className="font-display text-[13px] tracking-destiny text-white/80 uppercase">
              <span className="text-[var(--color-gold-accent)] text-[15px]">G</span>uardian<span className="text-[#7CB9E8] text-[15px]">G</span>rid <span className="text-[var(--color-gold-accent)]/70 text-[11px] tracking-destiny-wide">(adept)</span>
            </span>
          </div>
        </div>

        <header className="h-14 md:h-16 border-b border-white/[0.06] bg-header backdrop-blur-xl flex items-center justify-between px-4 md:px-8 shrink-0 z-10">
          <div className="flex items-center space-x-4">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 -ml-1 text-white hover:text-indigo-400 transition-colors" data-testid="button-demo-menu">
              <AnimatePresence mode="wait">
                {isMenuOpen ? (
                  <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}><X className="w-6 h-6" /></motion.div>
                ) : (
                  <motion.div key="menu" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}><Menu className="w-6 h-6" /></motion.div>
                )}
              </AnimatePresence>
            </button>
            <h2 className="font-display font-light text-sm tracking-destiny-wide text-white/90 uppercase">{tabTitles[activeTab]}</h2>
          </div>
        </header>

        <AnimatePresence>
          {isMenuOpen && (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30" onClick={() => setIsMenuOpen(false)} />
              <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} className="fixed top-7 left-0 bottom-0 w-72 bg-[#0a0e1a]/98 backdrop-blur-2xl border-r border-white/[0.08] z-40 flex flex-col">
                <div className="p-6 pb-4 border-b border-white/[0.06]">
                  <span className="font-display text-lg tracking-destiny text-white">GUARDIANGRID <span className="text-[var(--color-gold-accent)] text-sm">(Adept)</span></span>
                </div>
                <nav className="flex-1 py-4 px-3">
                  {[
                    { key: 'guardian', id: 'characters' as TabType, icon: Users, label: t('nav.characters') },
                    { key: 'vault', id: 'vault' as TabType, icon: Package, label: t('nav.vault') },
                    { key: 'loadouts', id: 'loadouts' as TabType, icon: Archive, label: t('nav.loadouts') },
                    { key: 'postmaster', id: 'postmaster' as TabType, icon: Mail, label: t('nav.postmaster') },
                    { key: 'collections', id: 'collections' as TabType, icon: BookOpen, label: t('nav.collections') },
                    { key: 'triumphs', id: 'triumphs' as TabType, icon: Trophy, label: t('nav.triumphs') },
                    { key: 'season', id: 'season' as TabType, icon: TrendingUp, label: t('nav.season') },
                  ].map((item, i) => (
                    <motion.button key={item.key} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 + i * 0.06, duration: 0.3 }}
                      onClick={() => { setActiveTab(item.id); setIsMenuOpen(false); }}
                      className={`w-full flex items-center gap-4 px-4 py-3.5 mb-1 rounded-lg transition-all duration-300 ${activeTab === item.id ? 'bg-white/[0.08] text-white' : 'text-gray-500 hover:text-white hover:bg-white/[0.04]'}`}>
                      <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-indigo-400' : ''}`} />
                      <span className="text-sm font-display tracking-destiny uppercase">{item.label}</span>
                    </motion.button>
                  ))}
                </nav>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <div className="flex-1 min-h-0 overflow-hidden relative">
          {activeTab === 'characters' && selectedCharacter?.className === 'Hunter' && (
            <>
              <img src={hunterBgImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.25] pointer-events-none z-0" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080b14] via-[#080b14]/50 to-transparent pointer-events-none z-0" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#080b14]/70 via-transparent to-[#080b14]/40 pointer-events-none z-0" />
            </>
          )}
          {activeTab === 'characters' && selectedCharacter?.className === 'Warlock' && (
            <>
              <img src={warlockBgImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.25] pointer-events-none z-0" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080b14] via-[#080b14]/50 to-transparent pointer-events-none z-0" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#080b14]/70 via-transparent to-[#080b14]/40 pointer-events-none z-0" />
            </>
          )}
          {activeTab === 'characters' && selectedCharacter?.className === 'Titan' && (
            <>
              <img src={titanBgImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-[0.25] pointer-events-none z-0" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#080b14] via-[#080b14]/50 to-transparent pointer-events-none z-0" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#080b14]/70 via-transparent to-[#080b14]/40 pointer-events-none z-0" />
            </>
          )}

          <AnimatePresence mode="wait" custom={tabDirection}>
            {activeTab === 'characters' && (
              <motion.div key="characters" custom={tabDirection} initial={{ opacity: 0, x: tabDirection * 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: tabDirection * -30 }} transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }} className="h-full flex flex-col relative">
                <div className="flex items-center gap-2 p-3 md:p-4 border-b border-white/[0.06] shrink-0 overflow-x-auto bg-black/20">
                  {characters.map(char => (
                    <button key={char.characterId} onClick={() => setSelectedCharacterId(char.characterId)}
                      className={`flex items-center gap-2.5 px-3.5 py-2.5 border transition-all duration-300 shrink-0 relative overflow-hidden ${
                        selectedCharacterId === char.characterId
                          ? 'bg-gradient-to-r from-indigo-600/20 to-transparent border-indigo-500/40 text-white shadow-lg shadow-indigo-900/20'
                          : 'bg-white/[0.03] border-white/[0.06] text-gray-400 hover:border-white/20 hover:bg-white/[0.05]'
                      }`}
                      data-testid={`button-demo-char-${char.characterId}`}>
                      {selectedCharacterId === char.characterId && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-indigo-500 to-purple-500" />}
                      {char.emblemPath && <img src={char.emblemPath} alt="" className="w-9 h-9 ring-1 ring-white/10" />}
                      <div className="text-left">
                        <p className="text-[11px] font-bold tracking-wider uppercase">{char.className}</p>
                        <p className="text-[11px] text-gray-500 flex items-center gap-1"><Sparkles className="w-2.5 h-2.5 text-[var(--color-gold-accent)]" /> {char.light}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {selectedCharacter && (
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    <motion.div key={selectedCharacter.characterId} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="relative overflow-hidden">
                      {selectedCharacter.emblemBackgroundPath && <img src={selectedCharacter.emblemBackgroundPath} alt="" className="absolute inset-0 w-full h-full object-cover opacity-60" />}
                      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#080b14] via-transparent to-transparent" />
                      <div className="relative z-10 p-5 md:p-7 flex items-center justify-between">
                        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1, duration: 0.5, ease: 'easeOut' }}>
                          <h3 className="text-2xl md:text-3xl text-white font-display font-light tracking-wider text-shadow-glow">{selectedCharacter.className}</h3>
                          <p className="text-[11px] text-gray-400 uppercase tracking-destiny-widest mt-1">{selectedCharacter.raceName}</p>
                        </motion.div>
                        <motion.div className="flex items-center gap-4" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.15, duration: 0.5, ease: 'easeOut' }}>
                          {(() => {
                            const subclassItem = selectedCharacter.equippedItems.find(i => i.slot === 'subclass');
                            return subclassItem?.icon ? <img src={subclassItem.icon} alt={subclassItem.name} title={subclassItem.name} className="w-12 h-12 drop-shadow-[0_0_8px_rgba(100,180,255,0.4)]" /> : null;
                          })()}
                          <div className="text-right">
                            <div className="flex items-center gap-2.5 justify-end">
                              <Sparkles className="w-5 h-5 text-[var(--color-gold-accent)] animate-[pulse_3s_ease-in-out_infinite]" />
                              <span className="text-4xl font-display font-light text-[var(--color-gold-accent)] text-shadow-glow">{selectedCharacter.light}</span>
                            </div>
                            <p className="text-[11px] text-gray-400 uppercase tracking-destiny-wide mt-1.5">{t('power.label')}</p>
                          </div>
                        </motion.div>
                      </div>
                    </motion.div>

                    {selectedCharacter.stats.length > 0 && (
                      <div className="px-4 md:px-6 pb-5">
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5">
                          {selectedCharacter.stats.map((stat, statIdx) => {
                            const val = stat.value;
                            const pct = Math.min((val / 200) * 100, 100);
                            const isMax = val >= 200;
                            const barColor = isMax ? 'from-[var(--color-gold-accent)] via-[var(--color-gold-accent)] to-[var(--color-gold-accent)]'
                              : val >= 100 ? 'from-purple-500 to-violet-400'
                              : val >= 60 ? 'from-emerald-600 to-green-400'
                              : val >= 20 ? 'from-yellow-600 to-amber-400'
                              : 'from-red-700 to-red-400';
                            const numColor = isMax ? 'text-[var(--color-gold-accent)]'
                              : val >= 100 ? 'text-purple-300'
                              : val >= 60 ? 'text-emerald-300'
                              : val >= 20 ? 'text-amber-300'
                              : 'text-red-400';
                            return (
                              <motion.div key={stat.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + statIdx * 0.06, duration: 0.4, ease: 'easeOut' }}
                                className={`bg-black/30 border p-2 hover:border-white/15 transition-all duration-300 ${isMax ? 'border-[var(--color-gold-accent)]/25' : 'border-white/[0.06]'}`} title={stat.description}>
                                <div className="flex items-center gap-1.5 mb-1.5">
                                  {stat.icon && <img src={stat.icon} alt={stat.name} className="w-4 h-4 opacity-70" />}
                                  <p className={`text-[11px] uppercase tracking-destiny truncate flex-1 ${isMax ? 'text-[var(--color-gold-accent)]/60' : 'text-gray-500'}`}>{stat.name}</p>
                                  <p className={`text-sm font-display font-light leading-none ${numColor}`}>{val}</p>
                                </div>
                                <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
                                  <div className={`h-full rounded-full bg-gradient-to-r ${barColor} transition-all duration-500`} style={{ width: `${pct}%` }} />
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5, ease: 'easeOut' }} className="px-4 md:px-6 pb-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Crosshair className="w-3.5 h-3.5 text-red-400/70" />
                        <h4 className="text-[11px] text-white/70 uppercase tracking-destiny-wide font-display">{t('section.weapons')}</h4>
                        <div className="flex-1 h-px bg-white/[0.06]" />
                      </div>
                      <div className="space-y-1">
                        {(['kinetic', 'energy', 'power'] as const).map(slotId => {
                          const equipped = selectedCharacter.equippedItems.find(i => i.slot === slotId);
                          if (!equipped) return null;
                          const isExotic = equipped.rarity === 'exotic';
                          const rarityColor = isExotic ? 'var(--color-gold-accent)' : 'var(--color-legendary)';
                          const perkNames = [
                            ...(equipped.perks || []).filter(p => p.isActive).map(p => p.name),
                            ...(equipped.mods || []).map(m => m.name),
                          ];
                          const rollResult = perkNames.length > 0 ? rateWeaponRoll(equipped.type, perkNames) : null;
                          return (
                            <div key={slotId} className={`group flex items-center gap-3 p-3 border transition-all duration-300 relative overflow-hidden bg-black/40 border-white/[0.06] hover:border-white/20 hover:bg-white/[0.03]`}>
                              {equipped.screenshot && (
                                <div className="absolute inset-0 opacity-[0.04] pointer-events-none">
                                  <img src={equipped.screenshot} alt="" className="w-full h-full object-cover blur-sm" />
                                </div>
                              )}
                              <div className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ backgroundColor: rarityColor }} />
                              <div className={`w-12 h-12 shrink-0 overflow-hidden relative flex items-center justify-center ring-1 ring-white/10 ${isExotic ? 'rarity-exotic-glow' : 'rarity-legendary-glow'}`}>
                                <div className="absolute top-0 left-0 w-full h-[2px] z-10" style={{ backgroundColor: rarityColor }} />
                                <img src={equipped.icon} alt={equipped.name} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1 min-w-0 relative z-10">
                                <p className="text-[11px] text-gray-500 uppercase tracking-destiny-wide mb-0.5 font-medium">
                                  {slotId === 'kinetic' ? 'Primär' : slotId === 'energy' ? 'Energie' : 'Schwer'}
                                </p>
                                <p className="text-[11px] font-bold truncate tracking-wider uppercase" style={{ color: isExotic ? 'var(--color-gold-accent)' : 'white' }}>{equipped.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[11px] text-yellow-500/80 flex items-center gap-0.5 font-medium">
                                    <Sparkles className="w-2.5 h-2.5" /> {equipped.power}
                                  </span>
                                  <span className="text-[11px] text-gray-600">{equipped.type}</span>
                                  {rollResult && <DemoRollBadge result={rollResult} />}
                                </div>
                                {equipped.perks && equipped.perks.filter(p => p.isActive).length > 0 && (
                                  <div className="flex items-center gap-1 mt-1 flex-wrap">
                                    {equipped.perks.filter(p => p.isActive).map((perk, i) => (
                                      <span key={i} className="text-[11px] px-1.5 py-0.5 bg-white/5 border border-white/10 text-gray-400 rounded-sm uppercase tracking-wider">{perk.name}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <button onClick={() => addToLoadout(toItem(equipped))} className="p-1.5 text-gray-600 hover:text-[var(--color-gold-accent)] hover:bg-yellow-500/10 rounded-sm opacity-0 group-hover:opacity-100 transition-all duration-200" title={t('action.toLoadout')}>
                                <Sparkles className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.5, ease: 'easeOut' }} className="px-4 md:px-6 pb-5">
                      <div className="flex items-center gap-2 mb-3">
                        <Shield className="w-3.5 h-3.5 text-blue-400/70" />
                        <h4 className="text-[11px] text-white/70 uppercase tracking-destiny-wide font-display">{t('section.armor')}</h4>
                        <div className="flex-1 h-px bg-white/[0.06]" />
                      </div>
                      <div className="space-y-1">
                        {(['helmet', 'arms', 'chest', 'legs', 'class'] as const).map(slotId => {
                          const equipped = selectedCharacter.equippedItems.find(i => i.slot === slotId);
                          if (!equipped) return null;
                          const isExotic = equipped.rarity === 'exotic';
                          const rarityColor = isExotic ? 'var(--color-gold-accent)' : 'var(--color-legendary)';
                          return (
                            <div key={slotId} className="group flex items-center gap-3 p-3 border transition-all duration-300 relative overflow-hidden bg-black/40 border-white/[0.06] hover:border-white/20 hover:bg-white/[0.03]">
                              <div className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ backgroundColor: rarityColor }} />
                              <div className={`w-12 h-12 shrink-0 overflow-hidden relative flex items-center justify-center ring-1 ring-white/10 ${isExotic ? 'rarity-exotic-glow' : ''}`}>
                                <div className="absolute top-0 left-0 w-full h-[2px] z-10" style={{ backgroundColor: rarityColor }} />
                                <img src={equipped.icon} alt={equipped.name} className="w-full h-full object-cover" />
                              </div>
                              <div className="flex-1 min-w-0 relative z-10">
                                <p className="text-[11px] text-gray-500 uppercase tracking-destiny-wide mb-0.5 font-medium">{equipped.type}</p>
                                <p className="text-[11px] font-bold truncate tracking-wider uppercase" style={{ color: isExotic ? 'var(--color-gold-accent)' : 'white' }}>{equipped.name}</p>
                                <span className="text-[11px] text-yellow-500/80 flex items-center gap-0.5 font-medium mt-0.5">
                                  <Sparkles className="w-2.5 h-2.5" /> {equipped.power}
                                </span>
                              </div>
                              <button onClick={() => addToLoadout(toItem(equipped))} className="p-1.5 text-gray-600 hover:text-[var(--color-gold-accent)] hover:bg-yellow-500/10 rounded-sm opacity-0 group-hover:opacity-100 transition-all duration-200" title={t('action.toLoadout')}>
                                <Sparkles className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>

                    {selectedCharacter.quests.length > 0 && (
                      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.5, ease: 'easeOut' }} className="px-4 md:px-6 pb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Activity className="w-3.5 h-3.5 text-green-400/70" />
                          <h4 className="text-[11px] text-white/70 uppercase tracking-destiny-wide font-display">Aktive Quests</h4>
                          <div className="flex-1 h-px bg-white/[0.06]" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                          {selectedCharacter.quests.map(quest => (
                            <div key={quest.id} className="flex items-center gap-3 bg-gradient-to-r from-white/[0.03] to-transparent border border-white/[0.06] p-3 hover:border-green-500/20 hover:from-green-500/[0.03] transition-all duration-300 group/quest">
                              <div className="w-10 h-10 shrink-0 ring-1 ring-white/10 overflow-hidden bg-black group-hover/quest:ring-green-500/20 transition-all">
                                {quest.icon && <img src={quest.icon} alt="" className="w-full h-full object-cover" />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-bold truncate tracking-wider uppercase text-white group-hover/quest:text-green-300/90 transition-colors">{quest.name}</p>
                                {quest.description && <p className="text-[11px] text-gray-500 truncate mt-0.5">{quest.description}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {activeTab === 'vault' && (
              <motion.div key="vault" initial={{ opacity: 0, x: tabDirection * 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: tabDirection * -30 }} transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }} className="h-full flex flex-col lg:flex-row">
                <div className="flex-1 flex flex-col min-w-0 border-r border-white/5 min-h-0 overflow-hidden">
                  <div className="p-4 md:p-6 pb-2 shrink-0 space-y-3">
                    <div className="relative group">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-indigo-400 transition-colors" />
                      <input type="text" placeholder={t('vault.search')} value={vaultFilters.search} onChange={(e) => setVaultFilters(f => ({ ...f, search: e.target.value }))}
                        className="w-full bg-[#0a0e18]/80 border border-white/[0.08] text-white pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-indigo-500/40 transition-all font-light tracking-wider destiny-clip-sm" data-testid="demo-input-vault-search" />
                    </div>
                    <p className="text-[11px] text-gray-600 tracking-widest uppercase">{filteredVaultItems.length} Gegenstände</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 md:p-6 pt-2">
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-7 gap-2 md:gap-3">
                      {filteredVaultItems.map(item => {
                        const isExotic = item.rarity === 'exotic';
                        const rarityColor = isExotic ? 'var(--color-gold-accent)' : 'var(--color-legendary)';
                        const isWeapon = ['kinetic', 'energy', 'power'].includes(item.slot);
                        const perkNames = [...(item.perks || []).filter(p => p.isActive).map(p => p.name), ...(item.mods || []).map(m => m.name)];
                        const rollResult = isWeapon && perkNames.length > 0 ? rateWeaponRoll(item.type, perkNames) : null;
                        return (
                          <div key={item.id}
                            className={`group relative bg-gradient-to-b from-white/[0.03] to-transparent border transition-all duration-500 destiny-clip-sm ${
                              isExotic ? 'border-[var(--color-gold-accent)]/20 hover:border-[var(--color-gold-accent)]/40 rarity-exotic-glow item-card-hover' : 'border-white/[0.08] hover:border-white/25 item-card-hover'
                            }`}>
                            <div className="h-[2px] w-full" style={{ backgroundColor: rarityColor }} />
                            <div className="aspect-[4/3] relative overflow-hidden bg-black/80">
                              <img src={item.screenshot || item.icon} alt={item.name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 brightness-90 group-hover:brightness-110" loading="lazy" />
                              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0e18] via-transparent to-transparent opacity-90" />
                            </div>
                            <div className="px-2.5 py-2 relative z-10">
                              <h4 className="text-[11px] font-bold truncate tracking-wider uppercase" style={{ color: isExotic ? 'var(--color-gold-accent)' : 'white' }}>{item.name}</h4>
                              <div className="flex items-center justify-between mt-0.5">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <p className="text-[11px] text-gray-500 uppercase tracking-widest truncate">{item.type}</p>
                                  {rollResult && <DemoRollBadge result={rollResult} />}
                                </div>
                                {item.power > 0 && (
                                  <p className="text-[11px] text-gray-400 flex items-center gap-0.5 shrink-0">
                                    <Sparkles className="w-2 h-2 text-[var(--color-gold-accent)]" /> {item.power}
                                  </p>
                                )}
                              </div>
                              {perkNames.length > 0 && (
                                <div className="flex items-center gap-0.5 mt-1 flex-wrap">
                                  {perkNames.slice(0, 3).map((p, i) => (
                                    <span key={i} className="text-[6px] px-1 py-0.5 bg-white/5 border border-white/10 text-gray-500 rounded-sm uppercase">{p}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="hidden lg:flex w-[380px] bg-[#0a0e18]/60 backdrop-blur-sm flex-col shrink-0 relative overflow-hidden">
                  <div className="p-6 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-white font-display font-light tracking-destiny-wide flex items-center gap-3 text-xs">
                      <Sparkles className="w-4 h-4 text-[var(--color-gold-accent)]" /> AKTIVES LOADOUT
                    </h3>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-3">
                    {ITEM_SLOTS.map(slot => (
                      <EquippedSlot key={slot.id} slotInfo={slot} item={loadout[slot.id]} onUnequip={() => unequipItem(slot.id)} />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'collections' && (
              <motion.div key="collections" initial={{ opacity: 0, x: tabDirection * 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: tabDirection * -30 }} transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }} className="h-full flex flex-col">
                <div className="p-4 md:p-6 pb-2 shrink-0 space-y-3">
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input type="text" placeholder={t('collections.search')} value={collectionsSearch} onChange={(e) => setCollectionsSearch(e.target.value)}
                      className="w-full bg-[#0a0e18]/80 border border-white/[0.08] text-white pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-indigo-500/40 transition-all font-light tracking-wider destiny-clip-sm" />
                  </div>
                  <div className="flex items-center gap-2">
                    {(['all', 'acquired', 'notAcquired'] as const).map(f => (
                      <button key={f} onClick={() => setCollectionsFilter(f)}
                        className={`px-3 py-1.5 text-[11px] uppercase tracking-widest border transition-all ${collectionsFilter === f ? 'bg-indigo-600/30 border-indigo-500/50 text-white' : 'bg-white/5 border-white/5 text-gray-500 hover:text-white'}`}>
                        {f === 'all' ? t('collections.all') : f === 'acquired' ? t('collections.acquired') : t('collections.notAcquired')}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 md:p-6 pt-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
                    {filteredCollectibles.map(c => (
                      <div key={c.collectibleHash} className={`group relative border transition-all duration-300 destiny-clip-sm ${c.acquired ? 'bg-gradient-to-b from-white/[0.04] to-transparent border-white/[0.08] hover:border-indigo-500/30' : 'bg-black/40 border-white/[0.04] opacity-40 grayscale hover:opacity-70'}`}>
                        <div className={`h-[2px] w-full ${c.acquired ? 'bg-indigo-500/60' : 'bg-gray-700/40'}`} />
                        <div className="aspect-square relative overflow-hidden bg-black/60 flex items-center justify-center p-2">
                          {c.icon ? <img src={c.icon} alt={c.name} className="w-full h-full object-contain" /> : <BookOpen className="w-8 h-8 text-gray-700" />}
                          {c.acquired && <div className="absolute top-1 right-1 w-4 h-4 bg-green-500/80 rounded-full flex items-center justify-center"><Check className="w-2.5 h-2.5 text-white" /></div>}
                        </div>
                        <div className="px-2 py-1.5">
                          <p className="text-[11px] font-bold truncate tracking-wider uppercase text-white">{c.name}</p>
                          {c.sourceString && <p className="text-[11px] text-gray-600 truncate mt-0.5">{c.sourceString}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'triumphs' && (
              <motion.div key="triumphs" initial={{ opacity: 0, x: tabDirection * 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: tabDirection * -30 }} transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }} className="h-full flex flex-col">
                <div className="p-4 md:p-6 pb-2 shrink-0 space-y-3">
                  <div className="relative group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input type="text" placeholder={t('triumphs.search')} value={triumphsSearch} onChange={(e) => setTriumphsSearch(e.target.value)}
                      className="w-full bg-[#0a0e18]/80 border border-white/[0.08] text-white pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-indigo-500/40 transition-all font-light tracking-wider destiny-clip-sm" />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 md:p-6 pt-2">
                  <div className="space-y-2">
                    {filteredRecords.map(record => (
                      <div key={record.recordHash} className={`border transition-all duration-300 p-3 ${record.completed ? 'bg-gradient-to-r from-[var(--color-gold-accent)]/[0.06] to-transparent border-[var(--color-gold-accent)]/20' : 'bg-gradient-to-r from-white/[0.02] to-transparent border-white/[0.06]'}`}>
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 shrink-0 flex items-center justify-center overflow-hidden ring-1 ${record.completed ? 'ring-[var(--color-gold-accent)]/30' : 'ring-white/10'}`}>
                            {record.icon ? <img src={record.icon} alt="" className="w-full h-full object-cover" /> : <Trophy className={`w-5 h-5 ${record.completed ? 'text-[var(--color-gold-accent)]' : 'text-gray-600'}`} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className={`text-[11px] font-bold tracking-wider uppercase truncate ${record.completed ? 'text-[var(--color-gold-accent)]' : 'text-white'}`}>{record.name}</h4>
                              {record.completed && <div className="shrink-0 w-4 h-4 bg-green-500/80 rounded-full flex items-center justify-center"><Check className="w-2.5 h-2.5 text-white" /></div>}
                              {record.scoreValue > 0 && <span className="text-[11px] text-[var(--color-gold-accent)]/60 shrink-0">{record.scoreValue} pts</span>}
                            </div>
                            {record.description && <p className="text-[11px] text-gray-500 mt-0.5">{record.description}</p>}
                            {record.objectives.length > 0 && !record.completed && (
                              <div className="mt-2 space-y-1.5">
                                {record.objectives.map((obj, i) => {
                                  const pct = obj.completionValue > 0 ? Math.min(100, (obj.progress / obj.completionValue) * 100) : 0;
                                  return (
                                    <div key={i}>
                                      <div className="flex items-center justify-between mb-0.5">
                                        <span className="text-[11px] text-gray-500">{obj.description || t('triumphs.progress')}</span>
                                        <span className="text-[11px] text-gray-400">{obj.progress}/{obj.completionValue}</span>
                                      </div>
                                      <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-500 ${obj.complete ? 'bg-green-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'season' && (
              <motion.div key="season" initial={{ opacity: 0, x: tabDirection * 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: tabDirection * -30 }} transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }} className="h-full overflow-y-auto p-4 md:p-8">
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <TrendingUp className="w-3.5 h-3.5 text-indigo-400/70" />
                      <h4 className="text-[11px] text-white/70 uppercase tracking-destiny-wide font-display">{t('season.progressions')}</h4>
                      <div className="flex-1 h-px bg-white/[0.06]" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {DEMO_PROGRESSIONS.map(prog => {
                        const pct = prog.nextLevelAt > 0 ? Math.min(100, (prog.progressToNextLevel / prog.nextLevelAt) * 100) : 100;
                        return (
                          <div key={prog.progressionHash} className="bg-gradient-to-r from-white/[0.03] to-transparent border border-white/[0.06] p-3 hover:border-indigo-500/20 transition-all duration-300">
                            <div className="flex items-center gap-3 mb-2">
                              {prog.icon ? <img src={prog.icon} alt="" className="w-8 h-8 ring-1 ring-white/10" /> : <div className="w-8 h-8 bg-indigo-500/10 flex items-center justify-center ring-1 ring-white/10"><TrendingUp className="w-4 h-4 text-indigo-400/50" /></div>}
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-bold truncate tracking-wider uppercase text-white">{prog.name}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[11px] text-indigo-400">{t('season.level')} {prog.level}</span>
                                  {prog.currentResetCount > 0 && <span className="text-[11px] text-[var(--color-gold-accent)]">{t('season.resets')}: {prog.currentResetCount}</span>}
                                </div>
                              </div>
                            </div>
                            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                            </div>
                            <p className="text-[11px] text-gray-600 mt-1 text-right">{prog.progressToNextLevel.toLocaleString()}/{prog.nextLevelAt > 0 ? prog.nextLevelAt.toLocaleString() : '—'}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {(activeTab === 'loadouts' || activeTab === 'postmaster') && (
              <motion.div key={activeTab} initial={{ opacity: 0, x: tabDirection * 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: tabDirection * -30 }} transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }} className="h-full flex flex-col items-center justify-center text-gray-500 space-y-6 p-8">
                {activeTab === 'loadouts' ? <Archive className="w-16 h-16 opacity-10" /> : <Mail className="w-16 h-16 opacity-10" />}
                <p className="font-display tracking-destiny-widest uppercase text-xs">Demo — {tabTitles[activeTab]}</p>
                <p className="text-xs text-gray-600 max-w-md text-center">
                  {activeTab === 'loadouts' ? 'Loadouts werden im echten Modus gespeichert und geladen.' : 'Postmeister-Items werden im echten Modus angezeigt.'}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {(activeTab === 'vault' || activeTab === 'characters') && (
        <button onClick={() => setShowMobileLoadout(true)}
          className="lg:hidden fixed bottom-6 right-4 z-30 w-14 h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-900/50 transition-all">
          <Sparkles className="w-5 h-5" />
          {Object.keys(loadout).length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--color-gold-accent)] text-black text-[11px] font-bold rounded-full flex items-center justify-center">{Object.keys(loadout).length}</span>
          )}
        </button>
      )}

      <AnimatePresence>
        {showMobileLoadout && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="lg:hidden fixed inset-0 z-40 bg-black/80 backdrop-blur-sm" onClick={() => setShowMobileLoadout(false)}>
            <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="absolute bottom-0 left-0 right-0 max-h-[85vh] bg-[#0a0e18] border-t border-white/[0.08] rounded-t-2xl flex flex-col"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-center pt-3 pb-1"><div className="w-10 h-1 bg-white/20 rounded-full" /></div>
              <div className="p-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="text-white font-display font-light tracking-destiny-wide flex items-center gap-3 text-sm">
                  <Sparkles className="w-4 h-4 text-[var(--color-gold-accent)]" /> AKTIVES LOADOUT
                </h3>
                <button onClick={() => setShowMobileLoadout(false)} className="p-2 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {ITEM_SLOTS.map(slot => (
                  <EquippedSlot key={slot.id} slotInfo={slot} item={loadout[slot.id]} onUnequip={() => unequipItem(slot.id)} />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DemoRollBadge({ result }: { result: RollResult }) {
  const { t } = useI18n();
  const { rating, sPerks, aPerks } = result;

  const badgeStyle = rating === 'META'
    ? 'bg-gradient-to-r from-[var(--color-gold-accent)]/20 to-[var(--color-gold-accent)]/20 border-[var(--color-gold-accent)]/40 text-[var(--color-gold-accent)] shadow-[0_0_8px_rgba(229,199,107,0.25)]'
    : rating === 'GOOD'
    ? 'bg-purple-500/15 border-purple-500/30 text-purple-300'
    : 'bg-white/5 border-white/10 text-gray-500';

  const label = rating === 'META' ? t('roll.meta') : rating === 'GOOD' ? t('roll.good') : t('roll.mid');

  return (
    <div className="group/roll relative">
      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wider border rounded-sm ${badgeStyle}`}>
        {rating === 'META' && <Sparkles className="w-2.5 h-2.5" />}
        {label}
      </span>
      {(sPerks.length > 0 || aPerks.length > 0) && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover/roll:block z-50 pointer-events-none">
          <div className="bg-black/95 border border-white/10 rounded px-2.5 py-2 min-w-[140px] max-w-[220px]">
            {sPerks.length > 0 && (
              <div className="mb-1">
                <p className="text-[11px] text-[var(--color-gold-accent)]/70 uppercase tracking-widest mb-0.5">{t('roll.sPerks')}</p>
                {sPerks.map(p => <p key={p} className="text-[11px] text-[var(--color-gold-accent)]">{p}</p>)}
              </div>
            )}
            {aPerks.length > 0 && (
              <div>
                <p className="text-[11px] text-purple-400/70 uppercase tracking-widest mb-0.5">{t('roll.aPerks')}</p>
                {aPerks.map(p => <p key={p} className="text-[11px] text-purple-300">{p}</p>)}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
