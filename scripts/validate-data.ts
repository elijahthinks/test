/**
 * Checks every record in /data against the shared zod schemas, plus a few
 * cross-record rules the schemas can't express on their own.
 *
 *   npm run data:validate
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import {
  conflictEventSchema,
  cyberIncidentSchema,
  threatGroupSchema,
} from "../shared/schema";

const DATA_DIR = join(process.cwd(), "data");
const load = (f: string): unknown => JSON.parse(readFileSync(join(DATA_DIR, f), "utf8"));

let failed = false;
function check<T>(file: string, schema: z.ZodType<T>): T[] {
  const result = z.array(schema).safeParse(load(file));
  if (!result.success) {
    failed = true;
    console.error(`✗ ${file}\n${z.prettifyError(result.error)}`);
    return [];
  }
  console.log(`✓ ${file}: ${result.data.length} records`);
  return result.data;
}

const groups = check("threat-groups.json", threatGroupSchema);
const events = check("conflict-events.json", conflictEventSchema);
const incidents = check("cyber-incidents.json", cyberIncidentSchema);

const groupIds = new Set(groups.map((g) => g.id));
const problems: string[] = [];
for (const rows of [groups, events, incidents] as { id: string }[][]) {
  const seen = new Set<string>();
  for (const r of rows) {
    if (seen.has(r.id)) problems.push(`duplicate id ${r.id}`);
    seen.add(r.id);
  }
}
for (const i of incidents) {
  if (i.attributed_group && !groupIds.has(i.attributed_group))
    problems.push(`${i.id}: unknown group "${i.attributed_group}"`);
  if (i.source.synthetic && i.confidence === "high")
    problems.push(`${i.id}: synthetic records must not claim high-confidence attribution`);
}
if (problems.length) {
  failed = true;
  console.error(problems.map((p) => `✗ ${p}`).join("\n"));
}
process.exit(failed ? 1 : 0);
