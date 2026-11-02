/**
 * Filter logic shared by the API (server-side query params) and the client
 * (instant filtering in the browser). One implementation, so the two can't
 * disagree about what "in range" means.
 */
import type {
  AttackType,
  ConflictEvent,
  CountryCode,
  CyberIncident,
  EventType,
} from "./schema";

export interface ConflictQuery {
  /** Inclusive, YYYY-MM-DD. */
  from?: string;
  /** Inclusive, YYYY-MM-DD. */
  to?: string;
  types?: EventType[];
  countries?: CountryCode[];
}

export interface CyberQuery {
  from?: string;
  to?: string;
  attackTypes?: AttackType[];
  countries?: CountryCode[];
  /** ThreatGroup.id */
  group?: string;
}

const inRange = (date: string, from?: string, to?: string) =>
  (!from || date >= from) && (!to || date <= to);
const allowed = <T>(value: T, list?: T[]) => !list || list.length === 0 || list.includes(value);

export const matchesConflict = (e: ConflictEvent, q: ConflictQuery) =>
  inRange(e.date, q.from, q.to) && allowed(e.event_type, q.types) && allowed(e.country, q.countries);

export const matchesCyber = (i: CyberIncident, q: CyberQuery) =>
  inRange(i.date, q.from, q.to) &&
  allowed(i.attack_type, q.attackTypes) &&
  allowed(i.target_country, q.countries) &&
  (!q.group || i.attributed_group === q.group);
