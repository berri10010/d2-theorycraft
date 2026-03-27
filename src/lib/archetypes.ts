import data from '../data/archetypes.json';
import { StatCurveNode } from '../types/weapon';

export interface ArchetypeDamage {
  crit: number;
  body: number;
  burstSize: number;
}

export interface ArchetypeInfo {
  label: string;
  pvp: ArchetypeDamage;
  pve: ArchetypeDamage;
}

export interface ArchetypeCurves {
  Range?: StatCurveNode[];
  Handling?: StatCurveNode[];
  Reload?: StatCurveNode[];
}

export const RESILIENCE_HP = data.resilienceHp as Record<string, number>;

function snapRpm(rpm: number, buckets: number[]): number {
  return buckets.reduce((closest, b) =>
    Math.abs(b - rpm) < Math.abs(closest - rpm) ? b : closest
  );
}

export function getArchetype(subType: number, rpm: number): ArchetypeInfo | null {
  const subtypeData = (data.subtypes as Record<string, { rpmBuckets: number[] }>)[String(subType)];
  if (!subtypeData) return null;
  const snapped = snapRpm(rpm, subtypeData.rpmBuckets);
  const key = `${subType}_${snapped}`;
  const archetype = (data.archetypes as Record<string, ArchetypeInfo>)[key];
  return archetype ?? null;
}

export function getCurves(subType: number): ArchetypeCurves {
  const curves = (data.curves as Record<string, ArchetypeCurves>)[String(subType)];
  return curves ?? (data.defaultCurves as ArchetypeCurves);
}
