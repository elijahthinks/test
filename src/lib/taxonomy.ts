/** Display labels and colors. Kept apart from the schema so copy can change freely. */
import type { AttackType, Confidence, EventType, Sector } from "../../shared/schema";

/**
 * Markers are colored by family, following ACLED's top-level grouping.
 * Seven separate hues can't all stay distinguishable on a map (every pair
 * can sit next to every other), so the seven types share four colors and
 * the exact type is always written out in the detail panel.
 */
export const FAMILIES = {
  battle: { label: "Battles", color: "#b44424" },
  remote: { label: "Explosions and remote violence", color: "#b48900" },
  civilians: { label: "Violence against civilians", color: "#b847a6" },
  demonstration: { label: "Protests and riots", color: "#7f7bfa" },
} as const;
export type Family = keyof typeof FAMILIES;
export const FAMILY_ORDER = Object.keys(FAMILIES) as Family[];

export const EVENT_TYPE_INFO: Record<EventType, { label: string; family: Family }> = {
  battle: { label: "Battle", family: "battle" },
  airstrike: { label: "Air or drone strike", family: "remote" },
  shelling: { label: "Shelling or artillery", family: "remote" },
  explosion_remote: { label: "Remote explosive", family: "remote" },
  violence_against_civilians: { label: "Attack on civilians", family: "civilians" },
  protest: { label: "Protest", family: "demonstration" },
  riot: { label: "Riot", family: "demonstration" },
};

export const ATTACK_TYPE_LABEL: Record<AttackType, string> = {
  espionage: "Espionage",
  ransomware: "Ransomware",
  ddos: "DDoS",
  defacement: "Defacement",
  phishing: "Phishing",
  wiper: "Wiper",
  supply_chain: "Supply chain",
  ics_disruption: "Industrial control tampering",
};

export const SECTOR_LABEL: Record<Sector, string> = {
  energy: "Energy",
  government: "Government",
  finance: "Finance",
  telecom: "Telecoms",
  water: "Water",
  transport: "Transport",
  health: "Health",
  defense: "Defense",
  media: "Media",
  education: "Education",
};

export const CONFIDENCE_LABEL: Record<Confidence, string> = {
  low: "Low confidence",
  medium: "Medium confidence",
  high: "High confidence",
};

export const PRECISION_LABEL = {
  exact: "Exact location",
  town: "Located to the nearest town",
  region: "Located to the region only",
} as const;

/** Sequential ramp for incident counts, darkest (fewest) first. */
export const CYBER_RAMP = ["#1f7074", "#258c8e", "#2ba9a7", "#46c4bc", "#6eded0"] as const;

export const PALETTE = {
  ink: "#161b2e",
  panel: "#1c2238",
  land: "#252c45",
  rule: "#3a4366",
  paper: "#e6e3d8",
  muted: "#9aa0b8",
  focus: "#f4d58d",
} as const;
