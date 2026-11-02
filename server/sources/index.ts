/**
 * Picks the data source implementations. This is the one line to change when
 * a real feed is ready, e.g.:
 *
 *   export const conflictSource: ConflictSource =
 *     process.env.ACLED_KEY ? new AcledConflictSource(process.env.ACLED_KEY) : new MockConflictSource();
 */
import type { FeatureCollection } from "geojson";
import countries from "../../data/countries.geo.json";
import { MockConflictSource } from "./mockConflict";
import { MockCyberSource } from "./mockCyber";
import type { BoundarySource, ConflictSource, CyberSource } from "./types";

export const conflictSource: ConflictSource = new MockConflictSource();
export const cyberSource: CyberSource = new MockCyberSource();
export const boundarySource: BoundarySource = {
  countries: async () => countries as FeatureCollection,
};

export type { ConflictSource, CyberSource, BoundarySource };
