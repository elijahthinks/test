import { z } from "zod";
import raw from "../../data/conflict-events.json";
import { conflictEventSchema, type ConflictEvent } from "../../shared/schema";
import { matchesConflict } from "../../shared/filters";
import type { ConflictQuery, ConflictSource } from "./types";

/** Serves the synthetic events in data/conflict-events.json. */
export class MockConflictSource implements ConflictSource {
  readonly id = "mock";
  // Parsing on load means a hand-edited JSON file fails loudly, not halfway through a request.
  private readonly events: ConflictEvent[] = z.array(conflictEventSchema).parse(raw);

  async listEvents(query: ConflictQuery) {
    return this.events.filter((e) => matchesConflict(e, query));
  }

  async getEvent(id: string) {
    return this.events.find((e) => e.id === id) ?? null;
  }
}
