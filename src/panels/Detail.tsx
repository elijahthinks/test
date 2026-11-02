import type { ReactNode } from "react";
import { COUNTRIES, type CountryCode } from "../../shared/constants";
import type { ConflictEvent, CyberIncident, ThreatGroup } from "../../shared/schema";
import type { Dataset } from "../lib/api";
import type { AppState } from "../state/appState";
import {
  ATTACK_TYPE_LABEL,
  EVENT_TYPE_INFO,
  FAMILIES,
  FAMILY_ORDER,
  PRECISION_LABEL,
  SECTOR_LABEL,
} from "../lib/taxonomy";
import { formatDate, formatNumber, plural } from "../lib/format";
import { AttributionLine, ConfidenceMeter, SampleTag, SectionHeading, SourceLine, TextButton } from "./ui";

interface Props {
  app: AppState;
  data: Dataset;
  onClose: () => void;
}

export function Detail({ app, data, onClose }: Props) {
  const sel = app.state.selection;
  if (!sel) {
    return (
      <p className="max-w-prose text-sm text-muted">
        Choose a point on the map to read about an event, or a shaded country to see its cyber incidents.
      </p>
    );
  }
  const groupsById = new Map(data.groups.map((g) => [g.id, g]));
  const openGroup = (id: string) => app.dispatch({ type: "selectGroup", id });
  const openCountry = (iso: CountryCode) => app.dispatch({ type: "select", selection: { kind: "country", iso } });

  let body: ReactNode = null;
  if (sel.kind === "event") {
    const e = data.events.find((x) => x.id === sel.id);
    body = e ? <EventDetail event={e} onOpenCountry={openCountry} /> : null;
  } else if (sel.kind === "country") {
    body = <CountryDetail iso={sel.iso} app={app} groupsById={groupsById} onOpenGroup={openGroup} />;
  } else {
    const g = groupsById.get(sel.id);
    body = g ? <GroupDetail group={g} app={app} onOpenCountry={openCountry} /> : null;
  }

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <TextButton onClick={onClose} label="Close details">
          Close
        </TextButton>
      </div>
      {body ?? <p className="text-sm text-muted">That record isn't in the current data.</p>}
    </div>
  );
}

/* ---------------------------------------------------------------- Event */

function EventDetail({ event: e, onOpenCountry }: { event: ConflictEvent; onOpenCountry: (iso: CountryCode) => void }) {
  const info = EVENT_TYPE_INFO[e.event_type];
  const fam = FAMILIES[info.family];
  return (
    <article className="space-y-6">
      <header>
        <h2 className="flex items-center gap-2.5 text-xl font-bold">
          <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full ring-2 ring-ink" style={{ background: fam.color }} />
          {info.label}
        </h2>
        {/* The family only adds information when it differs from the type itself. */}
        {info.family !== "battle" && info.family !== "civilians" ? <p className="mt-1 text-sm text-muted">{fam.label}</p> : null}
        <p className="mt-2 text-sm">
          {formatDate(e.date)}, {e.location_name}
          {e.admin1 && e.admin1 !== e.location_name ? `, ${e.admin1}` : ""}, {COUNTRIES[e.country]}
        </p>
        <p className="mt-0.5 text-xs text-muted">{PRECISION_LABEL[e.location_precision]}</p>
      </header>

      <p className="max-w-prose font-serif text-lg leading-relaxed">{e.summary}</p>

      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3 text-sm">
        <dt className="text-muted">Fatalities</dt>
        <dd>{e.fatalities === null ? "Not reported" : formatNumber(e.fatalities)}</dd>
        <dt className="text-muted">Actors</dt>
        <dd>
          <ul className="space-y-0.5">
            {e.actors.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </dd>
        <dt className="text-muted">Record</dt>
        <dd>{e.id}</dd>
      </dl>

      <section>
        <SectionHeading>Source</SectionHeading>
        <SourceLine source={e.source} />
      </section>

      <TextButton onClick={() => onOpenCountry(e.country)}>See all activity in {COUNTRIES[e.country]}</TextButton>
    </article>
  );
}

/* -------------------------------------------------------------- Country */

function CountryDetail({
  iso,
  app,
  groupsById,
  onOpenGroup,
}: {
  iso: CountryCode;
  app: AppState;
  groupsById: Map<string, ThreatGroup>;
  onOpenGroup: (id: string) => void;
}) {
  const events = app.events.filter((e) => e.country === iso);
  const incidents = app.incidents.filter((i) => i.target_country === iso).sort((a, b) => b.date.localeCompare(a.date));
  const fatalities = events.reduce((s, e) => s + (e.fatalities ?? 0), 0);
  const unattributed = incidents.filter((i) => !i.attributed_group).length;
  const byFamily = FAMILY_ORDER.map((f) => ({
    family: f,
    n: events.filter((e) => EVENT_TYPE_INFO[e.event_type].family === f).length,
  })).filter((x) => x.n > 0);
  const max = Math.max(1, ...byFamily.map((x) => x.n));
  const isFiltered = app.state.filters.country === iso;

  return (
    <article className="space-y-7">
      <header>
        <h2 className="text-xl font-bold">{COUNTRIES[iso]}</h2>
        <p className="mt-1 text-sm text-muted">Within the current filters.</p>
        <div className="mt-3">
          <TextButton onClick={() => app.dispatch({ type: "setCountry", value: isFiltered ? null : iso })}>
            {isFiltered ? "Show all countries" : `Show only ${COUNTRIES[iso]}`}
          </TextButton>
        </div>
      </header>

      <section>
        <SectionHeading>Conflict events</SectionHeading>
        {events.length ? (
          <>
            <p className="text-sm">
              {plural(events.length, "event")}, {plural(fatalities, "reported fatality", "reported fatalities")}
            </p>
            <ul className="mt-3 space-y-2">
              {byFamily.map(({ family, n }) => (
                <li key={family} className="grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-1 text-xs">
                  <span className="text-muted">{FAMILIES[family].label}</span>
                  <span className="text-paper">{n}</span>
                  <span className="col-span-2 h-1.5 rounded-r-sm" style={{ width: `${(n / max) * 100}%`, background: FAMILIES[family].color }} aria-hidden="true" />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-muted">No conflict events match the current filters.</p>
        )}
      </section>

      <section>
        <SectionHeading>Cyber incidents targeting {COUNTRIES[iso]}</SectionHeading>
        {incidents.length ? (
          <>
            <p className="text-sm">
              {plural(incidents.length, "incident")}.{" "}
              <span className="text-muted">
                {unattributed === incidents.length
                  ? "None has a public attribution."
                  : `${formatNumber(unattributed)} with no public attribution.`}
              </span>
            </p>
            <ul className="mt-3 divide-y divide-rule border-y border-rule">
              {incidents.map((i) => (
                <IncidentRow key={i.id} incident={i} group={i.attributed_group ? groupsById.get(i.attributed_group) ?? null : null} onOpenGroup={onOpenGroup} />
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-muted">No cyber incidents match the current filters.</p>
        )}
      </section>
    </article>
  );
}

function IncidentRow({
  incident: i,
  group,
  onOpenGroup,
}: {
  incident: CyberIncident;
  group: ThreatGroup | null;
  onOpenGroup?: (id: string) => void;
}) {
  return (
    <li className="py-3">
      <details className="group">
        <summary className="cursor-pointer list-none rounded [&::-webkit-details-marker]:hidden">
          <span className="flex items-baseline justify-between gap-3">
            <span className="font-medium">
              {ATTACK_TYPE_LABEL[i.attack_type]}
              <span className="font-normal text-muted">, {SECTOR_LABEL[i.sector].toLowerCase()}</span>
            </span>
            <span className="shrink-0 text-xs text-muted">{formatDate(i.date)}</span>
          </span>
          <span className="mt-1 flex items-center justify-between gap-3">
            <span className="text-sm">{group ? <span className="text-muted">Suspected {group.name}</span> : <span className="text-muted">Unattributed</span>}</span>
            <span className="text-xs text-muted underline decoration-rule underline-offset-4 group-open:hidden">Details</span>
            <span className="hidden text-xs text-muted underline decoration-rule underline-offset-4 group-open:inline">Hide</span>
          </span>
        </summary>
        <div className="mt-3 space-y-3">
          <p className="max-w-prose font-serif text-base leading-relaxed">{i.summary}</p>
          <div className="space-y-1.5">
            {group ? <AttributionLine group={group} confidence={i.confidence} onOpenGroup={onOpenGroup} /> : null}
            <p className="text-xs text-muted">{i.attribution_basis}</p>
          </div>
          <SourceLine source={i.source} />
        </div>
      </details>
    </li>
  );
}

/* ---------------------------------------------------------------- Group */

function GroupDetail({
  group: g,
  app,
  onOpenCountry,
}: {
  group: ThreatGroup;
  app: AppState;
  onOpenCountry: (iso: CountryCode) => void;
}) {
  const incidents = app.incidents.filter((i) => i.attributed_group === g.id).sort((a, b) => b.date.localeCompare(a.date));
  const sp = g.suspected_sponsor;
  return (
    <article className="space-y-7">
      <header>
        <h2 className="text-xl font-bold">{g.name}</h2>
        {g.aliases.length ? <p className="mt-1 text-sm text-muted">Also known as {g.aliases.join(", ")}</p> : null}
      </header>

      <p className="max-w-prose font-serif text-lg leading-relaxed">{g.description}</p>

      <section>
        <SectionHeading>Suspected sponsor</SectionHeading>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>{sp.value ?? "Not named in public reporting"}</span>
          <ConfidenceMeter level={sp.confidence} subject="in the sponsor" />
        </p>
        <p className="mt-2 max-w-prose text-sm text-muted">{sp.note}</p>
      </section>

      <section>
        <SectionHeading>Reported target countries</SectionHeading>
        <p className="mb-2 text-xs text-muted">Outlined on the map. Choose one to see its incidents.</p>
        <ul className="flex flex-wrap gap-1.5">
          {g.target_countries.map((iso) => (
            <li key={iso}>
              <button
                type="button"
                onClick={() => onOpenCountry(iso)}
                className="rounded-full border border-rule px-2.5 py-1 text-xs hover:border-paper"
              >
                {COUNTRIES[iso]}
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionHeading>Known techniques</SectionHeading>
        <ul className="space-y-2 text-sm">
          {g.techniques.map((t) => (
            <li key={t.id} className="grid grid-cols-[5.5rem_1fr] gap-3">
              <a
                href={`https://attack.mitre.org/techniques/${t.id.replace(".", "/")}/`}
                target="_blank"
                rel="noreferrer"
                className="text-muted underline decoration-rule underline-offset-4 hover:text-paper"
              >
                {t.id}
              </a>
              <span>{t.name}</span>
            </li>
          ))}
        </ul>
        {g.techniques_note ? <p className="mt-2 text-xs text-muted">{g.techniques_note}</p> : null}
      </section>

      <section>
        <SectionHeading>Sample incidents linked to this group</SectionHeading>
        {incidents.length ? (
          <>
            <p className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted">
              <SampleTag /> These links are illustrative and capped at medium confidence.
            </p>
            <ul className="divide-y divide-rule border-y border-rule">
              {incidents.map((i) => (
                <IncidentRow key={i.id} incident={i} group={g} />
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-muted">None in the current filters.</p>
        )}
      </section>

      <section>
        <SectionHeading>Source</SectionHeading>
        <SourceLine source={g.source} />
      </section>
    </article>
  );
}
