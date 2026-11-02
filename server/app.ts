/**
 * The HTTP API. Runs two ways:
 *  - locally through server/dev.ts (app.listen)
 *  - on Vercel through api/index.ts, as a single serverless function
 */
import express, { type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import {
  ATTACK_TYPES,
  COUNTRY_CODES,
  EVENT_TYPES,
  type CountryCode,
} from "../shared/schema";
import { boundarySource, conflictSource, cyberSource } from "./sources";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD").optional();
/** Accepts "a,b,c" and checks each item against an allowed list. */
const csv = <T extends string>(values: readonly T[]) =>
  z
    .string()
    .optional()
    .transform((s) => (s ? s.split(",").map((x) => x.trim()).filter(Boolean) : undefined))
    .pipe(z.array(z.enum(values as [T, ...T[]])).optional());

const conflictQuery = z.object({
  from: date,
  to: date,
  types: csv(EVENT_TYPES),
  countries: csv<CountryCode>(COUNTRY_CODES),
});
const cyberQuery = z.object({
  from: date,
  to: date,
  attack_types: csv(ATTACK_TYPES),
  countries: csv<CountryCode>(COUNTRY_CODES),
  group: z.string().optional(),
});

class BadRequest extends Error {}
function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const r = schema.safeParse(input);
  if (!r.success) throw new BadRequest(z.prettifyError(r.error));
  return r.data;
}

// The data only changes on deploy, so let Vercel's CDN cache responses.
function cache(res: Response) {
  res.set("Cache-Control", "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800");
}

export const app = express();
app.disable("x-powered-by");

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, sources: { conflict: conflictSource.id, cyber: cyberSource.id } });
});

app.get("/api/conflicts", async (req, res) => {
  const q = parse(conflictQuery, req.query);
  const data = await conflictSource.listEvents(q);
  cache(res);
  res.json({ source: conflictSource.id, count: data.length, data });
});

app.get("/api/conflicts/:id", async (req, res) => {
  const event = await conflictSource.getEvent(req.params.id);
  if (!event) return void res.status(404).json({ error: `No conflict event with id ${req.params.id}` });
  cache(res);
  res.json({ data: event });
});

app.get("/api/cyber/incidents", async (req, res) => {
  const { attack_types, ...rest } = parse(cyberQuery, req.query);
  const data = await cyberSource.listIncidents({ ...rest, attackTypes: attack_types });
  cache(res);
  res.json({ source: cyberSource.id, count: data.length, data });
});

app.get("/api/cyber/groups", async (_req, res) => {
  const data = await cyberSource.listGroups();
  cache(res);
  res.json({ source: cyberSource.id, count: data.length, data });
});

app.get("/api/cyber/groups/:id", async (req, res) => {
  const group = await cyberSource.getGroup(req.params.id);
  if (!group) return void res.status(404).json({ error: `No threat group with id ${req.params.id}` });
  cache(res);
  res.json({ data: group });
});

app.get("/api/countries", async (_req, res) => {
  cache(res);
  res.json(await boundarySource.countries());
});

app.use("/api", (_req, res) => {
  res.status(404).json({ error: "Unknown API route" });
});

// Express 5 forwards rejected promises from async handlers to here.
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof BadRequest) return void res.status(400).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: "Internal error" });
});

export default app;
