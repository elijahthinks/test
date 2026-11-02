import { z } from "zod";
import rawIncidents from "../../data/cyber-incidents.json";
import rawGroups from "../../data/threat-groups.json";
import {
  cyberIncidentSchema,
  threatGroupSchema,
  type CyberIncident,
  type ThreatGroup,
} from "../../shared/schema";
import { matchesCyber } from "../../shared/filters";
import type { CyberQuery, CyberSource } from "./types";

/** Serves synthetic incidents plus the curated ATT&CK group profiles. */
export class MockCyberSource implements CyberSource {
  readonly id = "mock";
  private readonly incidents: CyberIncident[] = z.array(cyberIncidentSchema).parse(rawIncidents);
  private readonly groups: ThreatGroup[] = z.array(threatGroupSchema).parse(rawGroups);

  async listIncidents(query: CyberQuery) {
    return this.incidents.filter((i) => matchesCyber(i, query));
  }

  async listGroups() {
    return this.groups;
  }

  async getGroup(id: string) {
    return this.groups.find((g) => g.id === id) ?? null;
  }
}
