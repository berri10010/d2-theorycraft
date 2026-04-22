/**
 * Mapping of Weapon Type and Frame to the specific list of stats that should be displayed.
 * Based on provided reference documentation.
 */

export type WeaponType =
  | 'Auto Rifle'
  | 'Hand Cannon'
  | 'Pulse Rifle'
  | 'Scout Rifle'
  | 'Sidearm'
  | 'Combat Bow'
  | 'Submachine Gun'
  | 'Fusion Rifle'
  | 'Sniper Rifle'
  | 'Shotgun'
  | 'Grenade Launcher'
  | 'Trace Rifle'
  | 'Glaive'
  | 'Machine Gun'
  | 'Sword'
  | 'Rocket Launcher'
  | 'Linear Fusion Rifle'
  | 'All';

export interface FrameMapping {
  [frameName: string]: string[];
}

export const WEAPON_STAT_MAPPINGS: Record<WeaponType, FrameMapping> = {
  // The 'All' category contains cross-type frame overrides that apply regardless of weapon type.
  // getStatsForWeapon checks this as a fallback when a frame name isn't found in the weapon's
  // own type mapping — this powers heat weapon (Blaster) stat layouts for Sidearms, ARs, etc.
  'All': {
    'Balanced Heat Weapon':  ['RPM', 'Impact', 'Range', 'Stability', 'Handling', 'Reload', 'Aim Assistance', 'Airborne Effectiveness', 'Zoom', 'Ammo Generation', 'Heat Generated', 'Cooling Efficiency', 'Vent Speed', 'Recoil Direction'],
    'Dynamic Heat Weapon':   ['RPM', 'Impact', 'Range', 'Stability', 'Handling', 'Reload', 'Aim Assistance', 'Airborne Effectiveness', 'Zoom', 'Ammo Generation', 'Heat Generated', 'Cooling Efficiency', 'Vent Speed', 'Recoil Direction'],
  },
  'Auto Rifle': {
    'The Rest': ['RPM', 'Impact', 'Range', 'Stability', 'Handling', 'Reload', 'Aim Assistance', 'Airborne Effectiveness', 'Zoom', 'Ammo Generation', 'Recoil Direction', 'Magazine'],
  },
  'Hand Cannon': {
    'The Rest': ['RPM', 'Impact', 'Range', 'Stability', 'Handling', 'Reload', 'Aim Assistance', 'Airborne Effectiveness', 'Zoom', 'Ammo Generation', 'Recoil Direction', 'Magazine'],
  },
  'Pulse Rifle': {
    'Micro-Missile': ['RPM', 'Blast Radius', 'Velocity', 'Stability', 'Handling', 'Reload', 'Aim Assistance', 'Airborne Effectiveness', 'Zoom', 'Ammo Generation', 'Recoil Direction', 'Magazine'],
    'The Rest': ['RPM', 'Impact', 'Range', 'Stability', 'Handling', 'Reload', 'Aim Assistance', 'Airborne Effectiveness', 'Zoom', 'Ammo Generation', 'Recoil Direction', 'Magazine'],
  },
  'Scout Rifle': {
    'The Rest': ['RPM', 'Impact', 'Range', 'Stability', 'Handling', 'Reload', 'Aim Assistance', 'Airborne Effectiveness', 'Zoom', 'Ammo Generation', 'Recoil Direction', 'Magazine'],
  },
  'Sidearm': {
    'LN2 Burst': ['RPM', 'Charge Time', 'Impact', 'Range', 'Stability', 'Handling', 'Reload', 'Aim Assistance', 'Airborne Effectiveness', 'Zoom', 'Ammo Generation', 'Recoil Direction', 'Magazine'],
    'Close the Gap': ['RPM', 'Charge Time', 'Impact', 'Range', 'Stability', 'Handling', 'Reload', 'Aim Assistance', 'Airborne Effectiveness', 'Zoom', 'Ammo Generation', 'Recoil Direction', 'Magazine'],
    'All at Once': ['RPM', 'Charge Time', 'Impact', 'Range', 'Stability', 'Handling', 'Reload', 'Aim Assistance', 'Airborne Effectiveness', 'Zoom', 'Ammo Generation', 'Recoil Direction', 'Magazine'],
    'Micro-Missile':       ['RPM', 'Blast Radius', 'Velocity', 'Stability', 'Handling', 'Reload', 'Aim Assistance', 'Airborne Effectiveness', 'Zoom', 'Ammo Generation', 'Recoil Direction', 'Magazine'],
    'Micro-Missile Frame': ['RPM', 'Blast Radius', 'Velocity', 'Stability', 'Handling', 'Reload', 'Aim Assistance', 'Airborne Effectiveness', 'Zoom', 'Ammo Generation', 'Recoil Direction', 'Magazine'],
    'The Rest': ['RPM', 'Impact', 'Range', 'Stability', 'Handling', 'Reload', 'Aim Assistance', 'Airborne Effectiveness', 'Zoom', 'Ammo Generation', 'Recoil Direction', 'Magazine'],
  },
  'Combat Bow': {
    'All': ['Draw Time', 'Impact', 'Accuracy', 'Persistence', 'Stability', 'Handling', 'Reload', 'Aim Assistance', 'Airborne Effectiveness', 'Zoom', 'Ammo Generation', 'Recoil Direction'],
  },
  'Submachine Gun': {
    'The Rest': ['RPM', 'Impact', 'Range', 'Stability', 'Handling', 'Reload', 'Aim Assistance', 'Airborne Effectiveness', 'Zoom', 'Ammo Generation', 'Recoil Direction', 'Magazine'],
  },
  'Fusion Rifle': {
    'Timeless Mythoclast': ['RPM', 'Charge Time', 'Impact', 'Range', 'Stability', 'Handling', 'Reload', 'Aim Assistance', 'Airborne Effectiveness', 'Zoom', 'Ammo Generation', 'Recoil Direction', 'Magazine'],
    'The Rest': ['Charge Time', 'Impact', 'Range', 'Stability', 'Handling', 'Reload', 'Aim Assistance', 'Airborne Effectiveness', 'Zoom', 'Ammo Generation', 'Recoil Direction', 'Magazine'],
  },
  'Sniper Rifle': {
    'The Rest': ['RPM', 'Impact', 'Range', 'Stability', 'Handling', 'Reload', 'Aim Assistance', 'Airborne Effectiveness', 'Zoom', 'Ammo Generation', 'Recoil Direction', 'Magazine'],
  },
  'Shotgun': {
    'All': ['RPM', 'Impact', 'Range', 'Stability', 'Handling', 'Reload', 'Aim Assistance', 'Airborne Effectiveness', 'Zoom', 'Ammo Generation', 'Recoil Direction', 'Magazine'],
  },
  'Grenade Launcher': {
    'All': ['RPM', 'Blast Radius', 'Velocity', 'Stability', 'Handling', 'Reload', 'Aim Assistance', 'Airborne Effectiveness', 'Zoom', 'Ammo Generation', 'Recoil Direction', 'Magazine'],
  },
  'Trace Rifle': {
    'All': ['RPM', 'Impact', 'Range', 'Stability', 'Handling', 'Reload', 'Aim Assistance', 'Airborne Effectiveness', 'Zoom', 'Ammo Generation', 'Recoil Direction', 'Magazine'],
  },
  'Glaive': {
    'All': ['RPM', 'Impact', 'Range', 'Shield Duration', 'Handling', 'Reload', 'Aim Assistance', 'Airborne Effectiveness', 'Zoom', 'Ammo Generation', 'Recoil Direction', 'Magazine'],
  },
  'Machine Gun': {
    'All': ['RPM', 'Impact', 'Range', 'Stability', 'Handling', 'Reload', 'Aim Assistance', 'Airborne Effectiveness', 'Zoom', 'Ammo Generation', 'Recoil Direction', 'Magazine'],
  },
  'Sword': {
    'All': ['Swing Speed', 'Impact', 'Guard Resistance', 'Charge Rate', 'Guard Endurance', 'Ammo Capacity'],
  },
  'Rocket Launcher': {
    'All': ['RPM', 'Blast Radius', 'Velocity', 'Stability', 'Handling', 'Reload', 'Aim Assistance', 'Airborne Effectiveness', 'Zoom', 'Ammo Generation', 'Recoil Direction', 'Magazine'],
  },
  'Linear Fusion Rifle': {
    'All': ['Charge Time', 'Impact', 'Range', 'Stability', 'Handling', 'Reload', 'Aim Assistance', 'Airborne Effectiveness', 'Zoom', 'Ammo Generation', 'Recoil Direction', 'Magazine'],
  },
};

/**
 * Resolve the list of stats to display based on weapon type and frame.
 *
 * Lookup order:
 *   1. Exact frame name within the weapon's own type mapping
 *   2. Exact frame name in the cross-type 'All' mapping (e.g. heat weapon frames
 *      that appear on Sidearms, Auto Rifles, etc.)
 *   3. "All" catch-all within the weapon's own type
 *   4. "The Rest" fallback within the weapon's own type
 */
export function getStatsForWeapon(type: string, frame: string | null): string[] {
  const typeKey = (Object.keys(WEAPON_STAT_MAPPINGS).find(k => k === type)) as WeaponType | undefined;
  const frameMapping = typeKey ? WEAPON_STAT_MAPPINGS[typeKey] : null;

  // 1. Specific frame match within own type
  if (frame && frameMapping?.[frame]) {
    return frameMapping[frame];
  }

  // 2. Cross-type 'All' frame override (e.g. "Dynamic Heat Weapon" on any weapon type)
  if (frame) {
    const allFrames = WEAPON_STAT_MAPPINGS['All'];
    if (allFrames?.[frame]) return allFrames[frame];
  }

  // 3. "All" catch-all within own type
  if (frameMapping?.['All']) {
    return frameMapping['All'];
  }

  // 4. "The Rest" fallback
  return frameMapping?.['The Rest'] ?? [];
}
