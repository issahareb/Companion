const S_TIER_PERKS: Record<string, Set<string>> = {
  'hand_cannon': new Set([
    'Vorpal Weapon', 'Kill Clip', 'Rampage', 'Explosive Payload', 'Opening Shot',
    'Rangefinder', 'Luck in the Chamber', 'Memento Mori', 'Desperado',
    'Incandescent', 'Frenzy', 'Hatchling', 'Destabilizing Rounds',
  ]),
  'pulse_rifle': new Set([
    'Kill Clip', 'Desperado', 'Headseeker', 'Rangefinder', 'Rampage',
    'Frenzy', 'Incandescent', 'Hatchling', 'Destabilizing Rounds',
  ]),
  'auto_rifle': new Set([
    'Kill Clip', 'Rampage', 'Subsistence', 'Frenzy', 'Target Lock',
    'Incandescent', 'Hatchling', 'Destabilizing Rounds',
  ]),
  'scout_rifle': new Set([
    'Rapid Hit', 'Explosive Payload', 'Vorpal Weapon', 'Frenzy',
    'Incandescent', 'Firefly', 'Fourth Time\'s the Charm',
  ]),
  'submachine_gun': new Set([
    'Subsistence', 'Frenzy', 'Rampage', 'Kill Clip', 'Hatchling',
    'Incandescent', 'Destabilizing Rounds', 'Voltshot',
  ]),
  'sidearm': new Set([
    'Rangefinder', 'Kill Clip', 'Frenzy', 'Vorpal Weapon',
    'Incandescent', 'Voltshot', 'Destabilizing Rounds',
  ]),
  'shotgun': new Set([
    'Vorpal Weapon', 'One-Two Punch', 'Trench Barrel', 'Opening Shot',
    'Slideshot', 'Surrounded', 'Frenzy', 'Incandescent',
  ]),
  'sniper_rifle': new Set([
    'Vorpal Weapon', 'Fourth Time\'s the Charm', 'Triple Tap', 'Snapshot Sights',
    'Firing Line', 'Frenzy', 'Reconstruction',
  ]),
  'fusion_rifle': new Set([
    'Vorpal Weapon', 'Surrounded', 'Reservoir Burst', 'Frenzy',
    'Controlled Burst', 'Successful Warm-Up', 'Cornered',
  ]),
  'trace_rifle': new Set([
    'Subsistence', 'Frenzy', 'Rewind Rounds', 'Destabilizing Rounds',
    'Incandescent', 'Hatchling',
  ]),
  'linear_fusion_rifle': new Set([
    'Vorpal Weapon', 'Firing Line', 'Fourth Time\'s the Charm', 'Triple Tap',
    'Frenzy', 'Reconstruction', 'Bait and Switch',
  ]),
  'grenade_launcher': new Set([
    'Vorpal Weapon', 'Chain Reaction', 'Frenzy', 'Spike Grenades',
    'Auto-Loading Holster', 'Demolitionist', 'Envious Assassin',
  ]),
  'rocket_launcher': new Set([
    'Vorpal Weapon', 'Lasting Impression', 'Chain Reaction', 'Explosive Light',
    'Auto-Loading Holster', 'Demolitionist', 'Envious Assassin', 'Bait and Switch',
  ]),
  'sword': new Set([
    'Whirlwind Blade', 'Surrounded', 'Vorpal Weapon', 'Chain Reaction',
    'Frenzy', 'Relentless Strikes', 'Assassin\'s Blade',
  ]),
  'bow': new Set([
    'Explosive Head', 'Archer\'s Tempo', 'Rapid Hit', 'Vorpal Weapon',
    'Dragonfly', 'Incandescent', 'Hatchling',
  ]),
  'machine_gun': new Set([
    'Subsistence', 'Rampage', 'Kill Clip', 'Vorpal Weapon', 'Reconstruction',
    'Target Lock', 'Incandescent', 'Destabilizing Rounds',
  ]),
  'glaive': new Set([
    'Vorpal Weapon', 'Frenzy', 'Swashbuckler', 'Unstoppable Force',
    'Incandescent', 'Destabilizing Rounds',
  ]),
};

const A_TIER_PERKS: Record<string, Set<string>> = {
  'hand_cannon': new Set([
    'Rapid Hit', 'Outlaw', 'Demolitionist', 'Swashbuckler', 'Multikill Clip',
    'Firefly', 'Dragonfly', 'Subsistence', 'Perpetual Motion',
  ]),
  'pulse_rifle': new Set([
    'Rapid Hit', 'Outlaw', 'Demolitionist', 'Swashbuckler', 'Multikill Clip',
    'Perpetual Motion', 'Moving Target', 'Firefly',
  ]),
  'auto_rifle': new Set([
    'Demolitionist', 'Swashbuckler', 'Outlaw', 'Dynamic Sway Reduction',
    'Perpetual Motion', 'Dragonfly', 'Firefly',
  ]),
  'scout_rifle': new Set([
    'Outlaw', 'Demolitionist', 'Rampage', 'Kill Clip', 'Dragonfly',
    'Perpetual Motion', 'Subsistence',
  ]),
  'submachine_gun': new Set([
    'Demolitionist', 'Swashbuckler', 'Outlaw', 'Perpetual Motion',
    'Dynamic Sway Reduction', 'Multikill Clip', 'Dragonfly',
  ]),
  'sidearm': new Set([
    'Demolitionist', 'Swashbuckler', 'Outlaw', 'Subsistence', 'Rampage',
    'Multikill Clip', 'Perpetual Motion',
  ]),
  'shotgun': new Set([
    'Auto-Loading Holster', 'Demolitionist', 'Rampage', 'Subsistence',
    'Swashbuckler', 'Pugilist', 'Grave Robber',
  ]),
  'sniper_rifle': new Set([
    'Auto-Loading Holster', 'Rapid Hit', 'Outlaw', 'Kill Clip',
    'Moving Target', 'No Distractions', 'Box Breathing',
  ]),
  'fusion_rifle': new Set([
    'Auto-Loading Holster', 'Demolitionist', 'Under Pressure', 'Backup Plan',
    'Tap the Trigger', 'High-Impact Reserves',
  ]),
  'trace_rifle': new Set([
    'Demolitionist', 'Dragonfly', 'Rampage', 'Kill Clip',
    'Dynamic Sway Reduction', 'Perpetual Motion',
  ]),
  'linear_fusion_rifle': new Set([
    'Auto-Loading Holster', 'Rapid Hit', 'Clown Cartridge', 'High-Impact Reserves',
    'Box Breathing', 'Demolitionist',
  ]),
  'grenade_launcher': new Set([
    'Demolitionist', 'Rampage', 'Ambitious Assassin', 'Danger Zone',
    'Wellspring', 'Subsistence',
  ]),
  'rocket_launcher': new Set([
    'Tracking Module', 'Cluster Bomb', 'Clown Cartridge', 'Danger Zone',
    'Field Prep', 'Wellspring', 'Frenzy',
  ]),
  'sword': new Set([
    'Eager Edge', 'En Garde', 'Tireless Blade', 'Demolitionist',
    'Swashbuckler', 'Attrition Orbs',
  ]),
  'bow': new Set([
    'Demolitionist', 'Rampage', 'Swashbuckler', 'Successful Warm-Up',
    'Perpetual Motion', 'Subsistence',
  ]),
  'machine_gun': new Set([
    'Demolitionist', 'Dragonfly', 'Auto-Loading Holster', 'Frenzy',
    'Swashbuckler', 'Perpetual Motion', 'Firefly',
  ]),
  'glaive': new Set([
    'Demolitionist', 'Subsistence', 'Auto-Loading Holster', 'Rampage',
    'Pugilist', 'Grave Robber',
  ]),
};

const UNIVERSAL_S_TIER = new Set([
  'Vorpal Weapon', 'Frenzy', 'Incandescent', 'Destabilizing Rounds',
  'Hatchling', 'Firing Line', 'Bait and Switch',
]);

const UNIVERSAL_A_TIER = new Set([
  'Demolitionist', 'Rapid Hit', 'Subsistence', 'Perpetual Motion',
  'Auto-Loading Holster', 'Reconstruction',
]);

const WEAPON_TYPE_MAP: Record<string, string> = {
  'Hand Cannon': 'hand_cannon',
  'Pulse Rifle': 'pulse_rifle',
  'Auto Rifle': 'auto_rifle',
  'Scout Rifle': 'scout_rifle',
  'Submachine Gun': 'submachine_gun',
  'Sidearm': 'sidearm',
  'Shotgun': 'shotgun',
  'Sniper Rifle': 'sniper_rifle',
  'Fusion Rifle': 'fusion_rifle',
  'Trace Rifle': 'trace_rifle',
  'Linear Fusion Rifle': 'linear_fusion_rifle',
  'Grenade Launcher': 'grenade_launcher',
  'Rocket Launcher': 'rocket_launcher',
  'Sword': 'sword',
  'Bow': 'bow',
  'Combat Bow': 'bow',
  'Machine Gun': 'machine_gun',
  'Glaive': 'glaive',
};

export type RollRating = 'META' | 'GOOD' | 'MID';

export interface RollResult {
  rating: RollRating;
  sPerks: string[];
  aPerks: string[];
}

export function rateWeaponRoll(
  weaponType: string,
  perkNames: string[]
): RollResult {
  const typeKey = WEAPON_TYPE_MAP[weaponType];
  const sTierSet = typeKey ? S_TIER_PERKS[typeKey] : undefined;
  const aTierSet = typeKey ? A_TIER_PERKS[typeKey] : undefined;

  const sPerks: string[] = [];
  const aPerks: string[] = [];

  for (const perk of perkNames) {
    if (sTierSet?.has(perk) || UNIVERSAL_S_TIER.has(perk)) {
      sPerks.push(perk);
    } else if (aTierSet?.has(perk) || UNIVERSAL_A_TIER.has(perk)) {
      aPerks.push(perk);
    }
  }

  let rating: RollRating;
  if (sPerks.length >= 3 || (sPerks.length >= 2 && aPerks.length >= 1)) {
    rating = 'META';
  } else if (sPerks.length >= 1 || aPerks.length >= 2) {
    rating = 'GOOD';
  } else {
    rating = 'MID';
  }

  return { rating, sPerks, aPerks };
}
