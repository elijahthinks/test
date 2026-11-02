/**
 * Generates the synthetic sample data in /data.
 *
 *   npm run data:generate
 *
 * Output is deterministic (seeded RNG), so re-running it gives the same files.
 * Every record it writes is marked `source.synthetic: true`. Place names and
 * coordinates are real towns; the events and incidents themselves are made up.
 * Actors are deliberately generic ("State forces (Syria)") so no real party is
 * credited with an event that never happened.
 *
 * Threat group profiles (data/threat-groups.json) are NOT generated here: they
 * are curated from MITRE ATT&CK. This script only reads them, to attribute
 * some synthetic incidents to groups that plausibly fit.
 */
import { writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  COUNTRIES,
  type AttackType,
  type Confidence,
  type ConflictEvent,
  type CountryCode,
  type CyberIncident,
  type EventType,
  type Sector,
  type ThreatGroup,
} from "../shared/schema";

// npm scripts always run from the repo root.
const DATA_DIR = join(process.cwd(), "data");

/* ---------------------------------------------------------------- RNG */

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261102);
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
function weighted<T extends string>(w: Partial<Record<T, number>>): T {
  const entries = Object.entries(w) as [T, number][];
  let r = rand() * entries.reduce((s, [, n]) => s + n, 0);
  for (const [k, n] of entries) if ((r -= n) <= 0) return k;
  return entries[entries.length - 1][0];
}
/** Skewed toward small numbers, the way real fatality counts are. */
const skewed = (max: number) => Math.floor(max * rand() ** 2.2);

const START = Date.UTC(2025, 0, 1);
const END = Date.UTC(2026, 9, 31);
const randomDate = () =>
  new Date(START + rand() * (END - START)).toISOString().slice(0, 10);

/* ---------------------------------------------------------- Places */

type Place = [name: string, lat: number, lng: number, admin1: string];

const PLACES: Record<CountryCode, Place[]> = {
  SYR: [
    ["Aleppo", 36.2, 37.16, "Aleppo"],
    ["Idlib", 35.93, 36.63, "Idlib"],
    ["Homs", 34.73, 36.71, "Homs"],
    ["Deir ez-Zor", 35.33, 40.14, "Deir ez-Zor"],
    ["Raqqa", 35.95, 39.01, "Raqqa"],
    ["Daraa", 32.62, 36.1, "Daraa"],
    ["Hama", 35.13, 36.75, "Hama"],
    ["Latakia", 35.52, 35.79, "Latakia"],
    ["Qamishli", 37.05, 41.23, "Al-Hasakah"],
    ["Palmyra", 34.56, 38.28, "Homs"],
    ["Douma", 33.57, 36.4, "Rif Dimashq"],
    ["Manbij", 36.53, 37.95, "Aleppo"],
    ["Sweida", 32.71, 36.57, "As-Suwayda"],
  ],
  YEM: [
    ["Marib", 15.46, 45.32, "Marib"],
    ["Taiz", 13.58, 44.02, "Taiz"],
    ["Hodeidah", 14.8, 42.95, "Al Hudaydah"],
    ["Sanaa", 15.37, 44.19, "Amanat al Asimah"],
    ["Aden", 12.79, 45.03, "Aden"],
    ["Saada", 16.94, 43.76, "Saada"],
    ["Al Bayda", 13.99, 45.57, "Al Bayda"],
    ["Hajjah", 15.69, 43.6, "Hajjah"],
    ["Ataq", 14.54, 46.83, "Shabwah"],
    ["Al Dhale", 13.7, 44.73, "Ad Dali"],
    ["Lahij", 13.06, 44.88, "Lahij"],
  ],
  IRQ: [
    ["Baghdad", 33.31, 44.37, "Baghdad"],
    ["Mosul", 36.34, 43.13, "Nineveh"],
    ["Kirkuk", 35.47, 44.39, "Kirkuk"],
    ["Erbil", 36.19, 44.01, "Erbil"],
    ["Basra", 30.51, 47.78, "Basra"],
    ["Tikrit", 34.6, 43.68, "Salah al-Din"],
    ["Ramadi", 33.42, 43.3, "Anbar"],
    ["Sinjar", 36.32, 41.87, "Nineveh"],
    ["Baqubah", 33.75, 44.64, "Diyala"],
    ["Nasiriyah", 31.05, 46.26, "Dhi Qar"],
    ["Sulaymaniyah", 35.56, 45.43, "Sulaymaniyah"],
  ],
  PSE: [
    ["Gaza City", 31.5, 34.47, "Gaza Strip"],
    ["Khan Younis", 31.34, 34.31, "Gaza Strip"],
    ["Rafah", 31.29, 34.25, "Gaza Strip"],
    ["Deir al-Balah", 31.42, 34.35, "Gaza Strip"],
    ["Jabalia", 31.53, 34.48, "Gaza Strip"],
    ["Jenin", 32.46, 35.3, "West Bank"],
    ["Nablus", 32.22, 35.26, "West Bank"],
    ["Tulkarm", 32.31, 35.03, "West Bank"],
    ["Hebron", 31.53, 35.1, "West Bank"],
    ["Ramallah", 31.9, 35.2, "West Bank"],
  ],
  LBN: [
    ["Nabatieh", 33.38, 35.48, "Nabatieh"],
    ["Tyre", 33.27, 35.2, "South Lebanon"],
    ["Bint Jbeil", 33.12, 35.43, "Nabatieh"],
    ["Baalbek", 34.0, 36.21, "Baalbek-Hermel"],
    ["Marjayoun", 33.36, 35.59, "Nabatieh"],
    ["Beirut", 33.89, 35.5, "Beirut"],
    ["Tripoli", 34.44, 35.83, "North Lebanon"],
  ],
  ISR: [
    ["Tel Aviv", 32.08, 34.78, "Tel Aviv"],
    ["Haifa", 32.79, 34.99, "Haifa"],
    ["Kiryat Shmona", 33.21, 35.57, "Northern District"],
    ["Sderot", 31.52, 34.6, "Southern District"],
    ["Jerusalem", 31.77, 35.21, "Jerusalem"],
    ["Metula", 33.28, 35.58, "Northern District"],
    ["Eilat", 29.56, 34.95, "Southern District"],
    ["Be'er Sheva", 31.25, 34.79, "Southern District"],
  ],
  IRN: [
    ["Tehran", 35.69, 51.39, "Tehran"],
    ["Isfahan", 32.65, 51.67, "Isfahan"],
    ["Mashhad", 36.3, 59.61, "Razavi Khorasan"],
    ["Zahedan", 29.5, 60.86, "Sistan and Baluchestan"],
    ["Ahvaz", 31.32, 48.67, "Khuzestan"],
    ["Tabriz", 38.08, 46.29, "East Azerbaijan"],
    ["Shiraz", 29.59, 52.58, "Fars"],
    ["Kermanshah", 34.31, 47.07, "Kermanshah"],
    ["Sanandaj", 35.31, 47.0, "Kurdistan"],
  ],
  TUR: [
    ["Istanbul", 41.01, 28.98, "Istanbul"],
    ["Ankara", 39.93, 32.86, "Ankara"],
    ["Diyarbakır", 37.91, 40.24, "Diyarbakır"],
    ["Hakkari", 37.57, 43.74, "Hakkari"],
    ["Şırnak", 37.52, 42.46, "Şırnak"],
    ["Izmir", 38.42, 27.14, "Izmir"],
    ["Gaziantep", 37.07, 37.38, "Gaziantep"],
  ],
  EGY: [
    ["Cairo", 30.04, 31.24, "Cairo"],
    ["Alexandria", 31.2, 29.92, "Alexandria"],
    ["Al Arish", 31.13, 33.8, "North Sinai"],
    ["Sheikh Zuweid", 31.21, 34.11, "North Sinai"],
  ],
  JOR: [
    ["Amman", 31.95, 35.93, "Amman"],
    ["Irbid", 32.55, 35.85, "Irbid"],
    ["Zarqa", 32.07, 36.09, "Zarqa"],
    ["Ruwaished", 32.51, 38.2, "Mafraq"],
  ],
  SAU: [
    ["Riyadh", 24.71, 46.68, "Riyadh"],
    ["Jizan", 16.89, 42.55, "Jazan"],
    ["Najran", 17.49, 44.13, "Najran"],
    ["Abha", 18.22, 42.51, "Asir"],
  ],
  BHR: [
    ["Manama", 26.23, 50.59, "Capital"],
    ["Sitra", 26.15, 50.62, "Capital"],
  ],
  KWT: [["Kuwait City", 29.38, 47.99, "Al Asimah"]],
  OMN: [["Muscat", 23.59, 58.41, "Muscat"]],
  ARE: [
    ["Abu Dhabi", 24.45, 54.38, "Abu Dhabi"],
    ["Dubai", 25.2, 55.27, "Dubai"],
  ],
  QAT: [["Doha", 25.29, 51.53, "Doha"]],
  CYP: [["Limassol", 34.68, 33.04, "Limassol"]],
};

/* --------------------------------------------------- Conflict events */

type EventMix = Partial<Record<EventType, number>>;
const CONFLICT_PLAN: Record<CountryCode, [count: number, mix: EventMix]> = {
  SYR: [30, { battle: 8, airstrike: 6, shelling: 5, explosion_remote: 5, violence_against_civilians: 3, protest: 2 }],
  YEM: [27, { battle: 9, airstrike: 7, shelling: 5, explosion_remote: 4, protest: 1 }],
  PSE: [22, { airstrike: 9, shelling: 3, violence_against_civilians: 4, battle: 2, protest: 3 }],
  IRQ: [16, { explosion_remote: 5, battle: 3, protest: 5, airstrike: 2, riot: 1 }],
  LBN: [13, { airstrike: 7, shelling: 4, protest: 2 }],
  ISR: [10, { explosion_remote: 5, protest: 4, shelling: 1 }],
  IRN: [11, { protest: 6, riot: 3, explosion_remote: 2 }],
  TUR: [8, { protest: 4, battle: 2, airstrike: 1, riot: 1 }],
  EGY: [6, { protest: 4, battle: 1, explosion_remote: 1 }],
  JOR: [5, { protest: 4, battle: 1 }],
  SAU: [4, { explosion_remote: 3, protest: 1 }],
  BHR: [2, { protest: 2 }],
  KWT: [1, { protest: 1 }],
  OMN: [1, { protest: 1 }],
  ARE: [1, { protest: 1 }],
  QAT: [1, { protest: 1 }],
  CYP: [1, { protest: 1 }],
};

const PROTEST_TOPICS = [
  "rising fuel prices",
  "electricity shortages",
  "unpaid public-sector wages",
  "the detention of activists",
  "the regional war",
  "water shortages",
  "the cost of living",
];
const STRIKE_TARGETS = [
  "a residential building",
  "a vehicle",
  "an open area",
  "a suspected weapons depot",
  "agricultural land",
  "a checkpoint",
];

function actorsFor(type: EventType, c: string): string[] {
  const state = `State forces (${c})`;
  const armed = `Non-state armed group (${c})`;
  const unknown = `Unidentified armed group (${c})`;
  const civilians = `Civilians (${c})`;
  switch (type) {
    case "battle":
      return [state, armed];
    case "airstrike":
      return [rand() < 0.5 ? state : "Foreign air force (unattributed)", ...(rand() < 0.6 ? [civilians] : [])];
    case "shelling":
      return [rand() < 0.5 ? state : armed, civilians];
    case "explosion_remote":
      return [unknown, ...(rand() < 0.5 ? [civilians] : [state])];
    case "violence_against_civilians":
      return [rand() < 0.7 ? unknown : state, civilians];
    case "protest":
      return [`Protesters (${c})`, ...(rand() < 0.3 ? [`Police forces (${c})`] : [])];
    case "riot":
      return [`Rioters (${c})`, `Police forces (${c})`];
  }
}

function summaryFor(type: EventType, place: string): string {
  switch (type) {
    case "battle":
      return `Armed clashes reported between state forces and a non-state armed group near ${place}.`;
    case "airstrike":
      return `Airstrike reported on ${pick(STRIKE_TARGETS)} in ${place}.`;
    case "shelling":
      return `Artillery or mortar fire reported hitting ${pick(STRIKE_TARGETS)} in ${place}.`;
    case "explosion_remote":
      return `${pick(["A drone strike", "A roadside bomb", "A rocket impact", "A car bomb"])} reported in ${place}. No group has claimed it.`;
    case "violence_against_civilians":
      return `Attack on civilians reported in ${place}. The perpetrator has not been identified.`;
    case "protest":
      return `Demonstration in ${place} over ${pick(PROTEST_TOPICS)}.`;
    case "riot":
      return `A protest over ${pick(PROTEST_TOPICS)} in ${place} turned violent, with clashes with police.`;
  }
}

function fatalitiesFor(type: EventType): number | null {
  const unreported = { protest: 0.1, riot: 0.15 }[type as string] ?? 0.15;
  if (rand() < unreported) return null;
  switch (type) {
    case "battle": return skewed(22);
    case "airstrike": return skewed(26);
    case "shelling": return skewed(8);
    case "explosion_remote": return skewed(11);
    case "violence_against_civilians": return 1 + skewed(6);
    case "protest": return rand() < 0.95 ? 0 : 1;
    case "riot": return skewed(3);
  }
}

const SYNTHETIC_CONFLICT_SOURCE = {
  name: "Synthetic sample, modeled on ACLED event categories",
  synthetic: true,
} as const;

function buildConflictEvents(): ConflictEvent[] {
  const raw: Omit<ConflictEvent, "id">[] = [];
  for (const code of Object.keys(CONFLICT_PLAN) as CountryCode[]) {
    const [count, mix] = CONFLICT_PLAN[code];
    const cname = COUNTRIES[code];
    for (let i = 0; i < count; i++) {
      const type = weighted(mix);
      const [place, lat, lng, admin1] = pick(PLACES[code]);
      const r = rand();
      const precision = r < 0.12 ? "exact" : r < 0.88 ? "town" : "region";
      const spread = { exact: 0.008, town: 0.035, region: 0.15 }[precision];
      const actors = actorsFor(type, cname);
      raw.push({
        date: randomDate(),
        lat: +(lat + (rand() - 0.5) * 2 * spread).toFixed(4),
        lng: +(lng + (rand() - 0.5) * 2 * spread).toFixed(4),
        country: code,
        admin1,
        location_name: place,
        event_type: type,
        actors,
        fatalities: fatalitiesFor(type),
        location_precision: precision,
        source: SYNTHETIC_CONFLICT_SOURCE,
        summary: summaryFor(type, place),
      });
    }
  }
  return withIds(raw, "CE");
}

/* ----------------------------------------------------- Cyber incidents */

const CYBER_TARGETS: Partial<Record<CountryCode, number>> = {
  ISR: 16, SAU: 10, ARE: 9, IRN: 7, JOR: 4, TUR: 4, KWT: 3, BHR: 3,
  QAT: 3, EGY: 3, IRQ: 3, LBN: 2, OMN: 2, PSE: 1, CYP: 1,
};
const ATTACK_MIX: Partial<Record<AttackType, number>> = {
  espionage: 26, ddos: 18, phishing: 12, ransomware: 12, defacement: 10,
  wiper: 9, ics_disruption: 7, supply_chain: 6,
};
const SECTOR_MIX: Partial<Record<Sector, number>> = {
  government: 24, energy: 14, finance: 14, telecom: 10, defense: 8,
  transport: 8, media: 7, health: 6, education: 5, water: 4,
};
const ICS_SECTORS: Partial<Record<Sector, number>> = { energy: 5, water: 4, transport: 1 };

const ORGS: Record<Sector, string[]> = {
  energy: ["a state-owned oil company", "a power distribution operator", "a gas pipeline operator"],
  government: ["a national ministry", "a municipal government", "a customs authority"],
  finance: ["a retail bank", "a payments processor", "an insurance group"],
  telecom: ["a mobile network operator", "an internet service provider"],
  water: ["a municipal water utility", "a desalination plant operator"],
  transport: ["a national airline", "a port operator", "a logistics company"],
  health: ["a hospital group", "a public health agency"],
  defense: ["a defense contractor", "a military supplier"],
  media: ["a national broadcaster", "a news website"],
  education: ["a public university", "a research institute"],
};

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const CYBER_SUMMARY: Record<AttackType, (org: string) => string> = {
  ransomware: (o) => `Files at ${o} were encrypted and a ransom note was left on affected servers. Some services were offline for several days.`,
  wiper: (o) => `Destructive malware erased data on systems at ${o}. A ransom-style note appeared, but no way to recover the data was offered.`,
  ddos: (o) => `${cap(o)}'s public websites were unavailable for several hours during a traffic flood claimed by a hacktivist channel.`,
  espionage: (o) => `A long-running intrusion at ${o} came to light after investigators found stolen credentials and staged data.`,
  defacement: (o) => `${cap(o)}'s website was defaced with political messaging.`,
  supply_chain: (o) => `Attackers reached ${o} through a compromised IT service provider.`,
  phishing: (o) => `Staff at ${o} received targeted phishing emails imitating a trusted partner. Several accounts were compromised.`,
  ics_disruption: (o) => `Operators at ${o} reported tampering with internet-exposed control devices and switched to manual operation.`,
};

/** Which groups' public profiles plausibly fit each kind of attack. */
const FITS: Record<AttackType, string[]> = {
  espionage: ["apt33", "oilrig", "muddywater", "magic-hound", "molerats", "volatile-cedar"],
  phishing: ["apt33", "oilrig", "muddywater", "magic-hound", "molerats"],
  ransomware: ["moses-staff", "agrius", "magic-hound"],
  wiper: ["agrius", "moses-staff", "predatory-sparrow", "apt33"],
  ics_disruption: ["cyberav3ngers", "predatory-sparrow"],
  defacement: ["cyberav3ngers", "predatory-sparrow", "moses-staff"],
  supply_chain: ["oilrig", "muddywater"],
  ddos: [],
};

const BASIS: Record<Exclude<Confidence, "high">, string[]> = {
  low: [
    "An online persona claimed it. The claim has not been independently verified.",
    "Techniques resemble past activity by this group, but no technical overlap was shown.",
    "A single vendor made the assessment, with little public evidence.",
  ],
  medium: [
    "Malware and infrastructure overlap with earlier activity that vendors attributed to this group.",
    "Two independent vendor reports point to the same group.",
  ],
};

const SYNTHETIC_CYBER_SOURCE = {
  name: "Synthetic sample, modeled on public incident reporting",
  synthetic: true,
} as const;

function buildCyberIncidents(groups: ThreatGroup[]): CyberIncident[] {
  const raw: Omit<CyberIncident, "id">[] = [];
  for (const code of Object.keys(CYBER_TARGETS) as CountryCode[]) {
    for (let i = 0; i < CYBER_TARGETS[code]!; i++) {
      const attack = weighted(ATTACK_MIX);
      const sector = weighted(attack === "ics_disruption" ? ICS_SECTORS : SECTOR_MIX);
      const org = `${pick(ORGS[sector])} in ${code === "ARE" ? "the " : ""}${COUNTRIES[code]}`;
      const candidates = groups.filter(
        (g) => FITS[attack].includes(g.id) && g.target_countries.includes(code),
      );
      let attributed_group: string | null = null;
      let confidence: Confidence = "low";
      let attribution_basis =
        attack === "ddos"
          ? "A hacktivist channel claimed it. No link to a known group was established."
          : "No public attribution.";
      // Sample data never gets "high": these attributions are illustrative.
      if (candidates.length && rand() < 0.58) {
        attributed_group = pick(candidates).id;
        confidence = rand() < 0.6 ? "low" : "medium";
        attribution_basis = pick(BASIS[confidence]);
      }
      raw.push({
        date: randomDate(),
        target_country: code,
        sector,
        attack_type: attack,
        attributed_group,
        confidence,
        attribution_basis,
        source: SYNTHETIC_CYBER_SOURCE,
        summary: CYBER_SUMMARY[attack](org),
      });
    }
  }
  return withIds(raw, "CI");
}

/* ------------------------------------------------------------ Output */

function withIds<T extends { date: string }>(rows: T[], prefix: string) {
  rows.sort((a, b) => a.date.localeCompare(b.date));
  const seq: Record<string, number> = {};
  return rows.map((r) => {
    const year = r.date.slice(0, 4);
    seq[year] = (seq[year] ?? 0) + 1;
    return { id: `${prefix}-${year}-${String(seq[year]).padStart(4, "0")}`, ...r };
  });
}

const groups: ThreatGroup[] = JSON.parse(
  readFileSync(join(DATA_DIR, "threat-groups.json"), "utf8"),
);
const events = buildConflictEvents();
const incidents = buildCyberIncidents(groups);
writeFileSync(join(DATA_DIR, "conflict-events.json"), JSON.stringify(events, null, 2) + "\n");
writeFileSync(join(DATA_DIR, "cyber-incidents.json"), JSON.stringify(incidents, null, 2) + "\n");
console.log(`Wrote ${events.length} conflict events and ${incidents.length} cyber incidents.`);
