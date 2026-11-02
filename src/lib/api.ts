import type { FeatureCollection, MultiPolygon, Polygon } from "geojson";
import type { ConflictEvent, CountryCode, CyberIncident, ThreatGroup } from "../../shared/schema";

export interface CountryProps {
  iso: string;
  name: string;
  in_scope: boolean;
  label_lng: number;
  label_lat: number;
}
export type Countries = FeatureCollection<Polygon | MultiPolygon, CountryProps>;

export interface Dataset {
  events: ConflictEvent[];
  incidents: CyberIncident[];
  groups: ThreatGroup[];
  countries: Countries;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path} returned ${res.status}`);
  return res.json() as Promise<T>;
}

/**
 * v1 loads everything once and filters in the browser with the same
 * functions the API uses (shared/filters.ts). With a large real feed you
 * would pass the filters as query params instead; the endpoints accept them.
 */
export async function loadDataset(): Promise<Dataset> {
  const [events, incidents, groups, countries] = await Promise.all([
    get<{ data: ConflictEvent[] }>("/api/conflicts"),
    get<{ data: CyberIncident[] }>("/api/cyber/incidents"),
    get<{ data: ThreatGroup[] }>("/api/cyber/groups"),
    get<Countries>("/api/countries"),
  ]);
  return { events: events.data, incidents: incidents.data, groups: groups.data, countries };
}

export type { CountryCode };
