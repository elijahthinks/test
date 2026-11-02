/**
 * The seam between the API and wherever the data comes from.
 *
 * v1 ships mock implementations that read /data. To use a real feed, write a
 * class that implements one of these interfaces, map the provider's fields to
 * the shared schema types, and register it in ./index.ts. Nothing else in the
 * server or the client needs to change.
 */
import type { FeatureCollection } from "geojson";
import type { ConflictEvent, CyberIncident, ThreatGroup } from "../../shared/schema";
import type { ConflictQuery, CyberQuery } from "../../shared/filters";

export type { ConflictQuery, CyberQuery };

export interface ConflictSource {
  /** Short label shown in API responses, e.g. "mock" or "acled". */
  readonly id: string;
  listEvents(query: ConflictQuery): Promise<ConflictEvent[]>;
  getEvent(id: string): Promise<ConflictEvent | null>;
}

export interface CyberSource {
  readonly id: string;
  listIncidents(query: CyberQuery): Promise<CyberIncident[]>;
  listGroups(): Promise<ThreatGroup[]>;
  getGroup(id: string): Promise<ThreatGroup | null>;
}

export interface BoundarySource {
  /** Country polygons with properties: iso, name, in_scope, label_lng, label_lat. */
  countries(): Promise<FeatureCollection>;
}
