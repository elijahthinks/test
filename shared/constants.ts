/**
 * Plain constants shared by the server and the client. Kept free of zod so
 * the browser bundle doesn't pull in the validation library.
 */

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

export const CONFIDENCE = ["low", "medium", "high"] as const;

export const EVENT_TYPES = [
  "battle",
  "airstrike",
  "shelling",
  "explosion_remote",
  "violence_against_civilians",
  "protest",
  "riot",
] as const;

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
