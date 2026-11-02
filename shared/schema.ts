/**
 * Record types shared by the server, the client and the data scripts.
 *
 * The zod schemas are the single source of truth: TypeScript types are
 * inferred from them, and `npm run data:validate` checks every JSON record
 * in /data against them. The client only imports types from this file, so
 * zod never ends up in the browser bundle.
 */
import { z } from "zod";

export const COUNTRIES = {
  BHR: "Bahrain",
  CYP: "Cyprus",
  EGY: "Egypt",
  IRN: "Iran",
  IRQ: "Iraq",
  ISR: "Israel",
  JOR: "Jordan",
  KWT: "Kuwait",
  LBN: "Lebanon",
  OMN: "Oman",
  PSE: "Palestine",
  QAT: "Qatar",
  SAU: "Saudi Arabia",
  SYR: "Syria",
  TUR: "Türkiye",
  ARE: "United Arab Emirates",
  YEM: "Yemen",
} as const;

export type CountryCode = keyof typeof COUNTRIES;
export const COUNTRY_CODES = Object.keys(COUNTRIES) as CountryCode[];
const countryCode = z.enum(COUNTRY_CODES as [CountryCode, ...CountryCode[]]);

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

export const CONFIDENCE = ["low", "medium", "high"] as const;
export const confidenceSchema = z.enum(CONFIDENCE);
export type Confidence = z.infer<typeof confidenceSchema>;

/** Where a record came from. Every record carries one. */
export const sourceRefSchema = z.object({
  name: z.string().min(1),
  url: z.url().optional(),
  retrieved: isoDate.optional(),
  /** True for generated sample data. The UI labels these records. */
  synthetic: z.boolean(),
});
export type SourceRef = z.infer<typeof sourceRefSchema>;

/* ------------------------------------------------------------------ */
/* Conflict events (modeled on ACLED's event categories)               */
/* ------------------------------------------------------------------ */

export const EVENT_TYPES = [
  "battle",
  "airstrike",
  "shelling",
  "explosion_remote",
  "violence_against_civilians",
  "protest",
  "riot",
] as const;
export const eventTypeSchema = z.enum(EVENT_TYPES);
export type EventType = z.infer<typeof eventTypeSchema>;

export const conflictEventSchema = z.object({
  id: z.string().regex(/^CE-\d{4}-\d{4}$/),
  date: isoDate,
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  country: countryCode,
  admin1: z.string().optional(),
  location_name: z.string(),
  event_type: eventTypeSchema,
  actors: z.array(z.string()).min(1),
  /** null means not reported. It is never coerced to 0. */
  fatalities: z.number().int().min(0).nullable(),
  /** How precisely the coordinates are known. */
  location_precision: z.enum(["exact", "town", "region"]),
  source: sourceRefSchema,
  summary: z.string(),
});
export type ConflictEvent = z.infer<typeof conflictEventSchema>;

/* ------------------------------------------------------------------ */
/* Cyber incidents: tied to the TARGET country, never a guessed origin */
/* ------------------------------------------------------------------ */

export const SECTORS = [
  "energy",
  "government",
  "finance",
  "telecom",
  "water",
  "transport",
  "health",
  "defense",
  "media",
  "education",
] as const;
export const sectorSchema = z.enum(SECTORS);
export type Sector = z.infer<typeof sectorSchema>;

export const ATTACK_TYPES = [
  "ransomware",
  "wiper",
  "ddos",
  "espionage",
  "defacement",
  "supply_chain",
  "phishing",
  "ics_disruption",
] as const;
export const attackTypeSchema = z.enum(ATTACK_TYPES);
export type AttackType = z.infer<typeof attackTypeSchema>;

export const cyberIncidentSchema = z.object({
  id: z.string().regex(/^CI-\d{4}-\d{4}$/),
  date: isoDate,
  target_country: countryCode,
  sector: sectorSchema,
  attack_type: attackTypeSchema,
  /** ThreatGroup.id, or null when nobody credible has attributed it. */
  attributed_group: z.string().nullable(),
  /** Confidence in the attribution, not in the incident itself. */
  confidence: confidenceSchema,
  /** Why the attribution was made, in plain words. */
  attribution_basis: z.string(),
  source: sourceRefSchema,
  summary: z.string(),
});
export type CyberIncident = z.infer<typeof cyberIncidentSchema>;

/* ------------------------------------------------------------------ */
/* Threat group profiles                                                */
/* ------------------------------------------------------------------ */

export const techniqueSchema = z.object({
  /** MITRE ATT&CK technique ID, e.g. T1566.001 (Enterprise) or T0883 (ICS). */
  id: z.string().regex(/^T\d{4}(\.\d{3})?$/),
  name: z.string(),
});
export type Technique = z.infer<typeof techniqueSchema>;

export const threatGroupSchema = z.object({
  id: z.string(),
  /** MITRE ATT&CK group ID when the group has one. */
  attack_id: z.string().regex(/^G\d{4}$/).nullable(),
  name: z.string(),
  aliases: z.array(z.string()),
  suspected_sponsor: z.object({
    value: z.string().nullable(),
    confidence: confidenceSchema,
    note: z.string(),
  }),
  target_countries: z.array(countryCode),
  techniques: z.array(techniqueSchema),
  /** Where the technique list came from, when it differs from `source`. */
  techniques_note: z.string().optional(),
  description: z.string(),
  source: sourceRefSchema,
});
export type ThreatGroup = z.infer<typeof threatGroupSchema>;
