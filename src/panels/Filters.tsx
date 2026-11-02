import { ATTACK_TYPES, COUNTRIES, COUNTRY_CODES, EVENT_TYPES, type CountryCode } from "../../shared/schema";
import type { AppState } from "../state/appState";
import { ATTACK_TYPE_LABEL, CYBER_RAMP, EVENT_TYPE_INFO, FAMILIES, FAMILY_ORDER } from "../lib/taxonomy";
import { formatMonth } from "../lib/format";
import { CYBER_BREAKS } from "../map/style";
import { Chip, SectionHeading, Switch, TextButton } from "./ui";

export function Filters({ app }: { app: AppState }) {
  const { state, dispatch, months } = app;
  const f = state.filters;

  return (
    <div className="space-y-7">
      {!app.isDefault ? (
        <div className="flex items-center justify-between rounded border border-rule px-3 py-2 text-sm">
          <span className="text-muted">Filters are narrowing the map.</span>
          <TextButton onClick={() => dispatch({ type: "resetFilters" })}>Reset filters</TextButton>
        </div>
      ) : null}

      <section aria-labelledby="layers-h">
        <SectionHeading>
          <span id="layers-h">Layers</span>
        </SectionHeading>
        <div className="space-y-5">
          <div>
            <Switch
              checked={state.layers.conflict}
              onChange={() => dispatch({ type: "toggleLayer", layer: "conflict" })}
              label="Conflict events"
              description="Points where events took place, grouped when they overlap."
            />
            <ul className="mt-3 ml-12 space-y-1.5" aria-label="Conflict colors">
              {FAMILY_ORDER.map((fam) => (
                <li key={fam} className="flex items-center gap-2 text-xs text-muted">
                  <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full ring-2 ring-ink" style={{ background: FAMILIES[fam].color }} />
                  {FAMILIES[fam].label}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <Switch
              checked={state.layers.cyber}
              onChange={() => dispatch({ type: "toggleLayer", layer: "cyber" })}
              label="Cyber incidents"
              description="Shaded by how many incidents targeted each country. Origins aren't mapped."
            />
            <CyberLegend />
          </div>
        </div>
      </section>

      <section aria-labelledby="dates-h">
        <SectionHeading>
          <span id="dates-h">Dates</span>
        </SectionHeading>
        <p className="mb-2 text-sm" aria-live="polite">
          {formatMonth(months[f.monthFrom])} to {formatMonth(months[f.monthTo])}
        </p>
        <div className="range-dual">
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded bg-rule" aria-hidden="true" />
          <div
            className="absolute top-1/2 h-1 -translate-y-1/2 rounded bg-paper"
            aria-hidden="true"
            style={{
              left: `${(f.monthFrom / (months.length - 1)) * 100}%`,
              right: `${100 - (f.monthTo / (months.length - 1)) * 100}%`,
            }}
          />
          <input
            type="range"
            min={0}
            max={months.length - 1}
            value={f.monthFrom}
            aria-label="Start month"
            aria-valuetext={formatMonth(months[f.monthFrom])}
            onChange={(e) => dispatch({ type: "setMonths", from: Math.min(+e.target.value, f.monthTo), to: f.monthTo })}
          />
          <input
            type="range"
            min={0}
            max={months.length - 1}
            value={f.monthTo}
            aria-label="End month"
            aria-valuetext={formatMonth(months[f.monthTo])}
            onChange={(e) => dispatch({ type: "setMonths", from: f.monthFrom, to: Math.max(+e.target.value, f.monthFrom) })}
          />
        </div>
        <div className="mt-1 flex justify-between text-xs text-muted" aria-hidden="true">
          <span>{formatMonth(months[0])}</span>
          <span>{formatMonth(months[months.length - 1])}</span>
        </div>
      </section>

      <section aria-labelledby="country-h">
        <SectionHeading>
          <label id="country-h" htmlFor="country-select">
            Country
          </label>
        </SectionHeading>
        <select
          id="country-select"
          value={f.country ?? ""}
          onChange={(e) => dispatch({ type: "setCountry", value: (e.target.value || null) as CountryCode | null })}
          className="w-full rounded border border-rule bg-ink px-3 py-2 text-sm text-paper"
        >
          <option value="">All 17 countries</option>
          {[...COUNTRY_CODES]
            .sort((a, b) => COUNTRIES[a].localeCompare(COUNTRIES[b]))
            .map((code) => (
              <option key={code} value={code}>
                {COUNTRIES[code]}
              </option>
            ))}
        </select>
      </section>

      <section aria-labelledby="types-h">
        <SectionHeading
          action={
            <TextButton
              onClick={() =>
                dispatch({ type: "setEventTypes", values: f.eventTypes.length === EVENT_TYPES.length ? [] : [...EVENT_TYPES] })
              }
            >
              {f.eventTypes.length === EVENT_TYPES.length ? "Clear all" : "Select all"}
            </TextButton>
          }
        >
          <span id="types-h">Conflict event types</span>
        </SectionHeading>
        <div className="space-y-3">
          {FAMILY_ORDER.map((fam) => (
            <div key={fam} role="group" aria-label={FAMILIES[fam].label}>
              <p className="mb-1.5 text-xs text-muted">{FAMILIES[fam].label}</p>
              <div className="flex flex-wrap gap-1.5">
                {EVENT_TYPES.filter((t) => EVENT_TYPE_INFO[t].family === fam).map((t) => (
                  <Chip
                    key={t}
                    pressed={f.eventTypes.includes(t)}
                    onClick={() => dispatch({ type: "toggleEventType", value: t })}
                    swatch={FAMILIES[fam].color}
                  >
                    {EVENT_TYPE_INFO[t].label}
                  </Chip>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="attack-h">
        <SectionHeading>
          <span id="attack-h">Cyber attack types</span>
        </SectionHeading>
        <div className="flex flex-wrap gap-1.5">
          {ATTACK_TYPES.map((t) => (
            <Chip key={t} pressed={f.attackTypes.includes(t)} onClick={() => dispatch({ type: "toggleAttackType", value: t })}>
              {ATTACK_TYPE_LABEL[t]}
            </Chip>
          ))}
        </div>
      </section>
    </div>
  );
}

function CyberLegend() {
  const labels = CYBER_BREAKS.map((b, i) => {
    const next = CYBER_BREAKS[i + 1];
    return next ? (next - 1 === b ? `${b}` : `${b}–${next - 1}`) : `${b}+`;
  });
  return (
    <div className="mt-3 ml-12">
      <div className="flex" aria-hidden="true">
        {CYBER_RAMP.map((c) => (
          <span key={c} className="h-2.5 flex-1 first:rounded-l-sm last:rounded-r-sm" style={{ background: c }} />
        ))}
      </div>
      <div className="mt-1 flex text-xs text-muted">
        {labels.map((l) => (
          <span key={l} className="flex-1">
            {l}
          </span>
        ))}
      </div>
      <p className="sr-only">Incident count classes: {labels.join(", ")}.</p>
      <div className="mt-3 flex items-start gap-2 text-xs text-muted">
        <span aria-hidden="true" className="hatch mt-0.5 h-3.5 w-6 shrink-0 rounded-sm" style={{ backgroundColor: CYBER_RAMP[3] }} />
        <span>Hatched where most incidents have no public attribution.</span>
      </div>
    </div>
  );
}
