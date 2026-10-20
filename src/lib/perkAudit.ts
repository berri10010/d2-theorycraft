import PERK_AUDIT_RAW from '../data/perkAudit.json';

/** Clarity-verification annotation per perk name (src/data/perkAudit.json). */
export type AuditAnnotation = { clarityVerified: boolean; notes: string };

export const PERK_AUDIT = PERK_AUDIT_RAW as Record<string, AuditAnnotation | undefined>;
