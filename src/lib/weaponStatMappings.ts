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
  | 'Special/Heavy Grenade Launcher'
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
  'All': {
    'Balanced/Dynamic Heat weapon': ['RPM', 'Impact', 'Range', 'Stability', 'Handling', 'Reload', 'Aim Assistance', 'Airborne Effectiveness', 'Zoom', 'Ammo Generation', 'Heat generated', 'Cooling Efficiency', 'Recoil Direction'],
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
    'Micro-Missile': ['RPM', 'Blast Radius', 'Velocity', 'Stability', 'Handling', 'Reload', 'Aim Assistance', 'Airborne Effectiveness', 'Zoom', 'Ammo Generation', 'Recoil Direction', 'Magazine'],
    'The Rest': ['RPM', 'Impact', 'Range', 'Stability', 'Handling', 'Reload', 'Aim Assistance', 'Airborne Effectiveness', 'Zoom', 'Ammo Generation', 'Recoil Direction', 'Magazine'],
  },
  'Combat Bow': {
    'All': ['Draw Time', 'Impact', 'Accuracy', 'Stability', 'Handling', 'Reload', 'Aim Assistance', 'Airborne Effectiveness', 'Zoom', 'Ammo Generation', 'Recoil Direction'],
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
  'Special/Heavy Grenade Launcher': {
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
 */
export function getStatsForWeapon(type: string, frame: string | null): string[] {
  const typeKey = (Object.keys(WEAPON_STAT_MAPPINGS).find(k => k === type) || 'All') as WeaponType;
  const frameMapping = WEAPON_STAT_MAPPINGS[typeKey];
  
  if (!frameMapping) return [];

  // 1. Check for specific frame match
  if (frame && frameMapping[frame]) {
    return frameMapping[frame];
  }

  // 2. Check for "All" frame
  if (frameMapping['All']) {
    return frameMapping['All'];
  }

  // 3. Fallback to "The Rest"
  return frameMapping['The Rest'] ?? [];
}
